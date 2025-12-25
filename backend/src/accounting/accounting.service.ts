import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface LedgerAccount {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  debit: number;
  credit: number;
  parentCode?: string;
  children?: LedgerAccount[];
}

export interface JournalEntry {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  lines: JournalEntryLine[];
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  createdAt: Date;
}

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface FinancialStatement {
  type: 'BALANCE_SHEET' | 'PROFIT_LOSS' | 'CASH_FLOW';
  period: { startDate: string; endDate: string };
  generatedAt: Date;
  data: any;
}

// Romanian Chart of Accounts (Plan de Conturi)
const ROMANIAN_CHART_OF_ACCOUNTS: LedgerAccount[] = [
  // Class 1 - Capital accounts
  { code: '101', name: 'Capital social', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },
  { code: '117', name: 'Rezultatul reportat', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },
  { code: '121', name: 'Profit sau pierdere', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },

  // Class 2 - Fixed assets
  { code: '211', name: 'Terenuri', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '212', name: 'Constructii', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '213', name: 'Instalatii tehnice', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '214', name: 'Mobilier si echipamente', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '281', name: 'Amortizari privind imobilizarile corporale', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 3 - Inventory
  { code: '301', name: 'Materii prime', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '302', name: 'Materiale consumabile', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '345', name: 'Produse finite', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '371', name: 'Marfuri', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 4 - Third parties
  { code: '401', name: 'Furnizori', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '404', name: 'Furnizori de imobilizari', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '411', name: 'Clienti', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '421', name: 'Personal - salarii datorate', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '431', name: 'Asigurari sociale', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4423', name: 'TVA de plata', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4426', name: 'TVA deductibila', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '4427', name: 'TVA colectata', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4428', name: 'TVA neexigibila', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '441', name: 'Impozit pe profit', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },

  // Class 5 - Treasury
  { code: '5121', name: 'Conturi la banci in lei', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '5124', name: 'Conturi la banci in valuta', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '531', name: 'Casa', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 6 - Expenses
  { code: '601', name: 'Cheltuieli cu materii prime', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '602', name: 'Cheltuieli cu materiale consumabile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '607', name: 'Cheltuieli privind marfurile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '611', name: 'Cheltuieli cu intretinerea si reparatiile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '612', name: 'Cheltuieli cu redeventele', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '613', name: 'Cheltuieli cu primele de asigurare', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '621', name: 'Cheltuieli cu colaboratorii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '622', name: 'Cheltuieli privind comisioanele', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '623', name: 'Cheltuieli de protocol', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '624', name: 'Cheltuieli cu transportul', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '625', name: 'Cheltuieli cu deplasari', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '626', name: 'Cheltuieli postale si telecomunicatii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '627', name: 'Cheltuieli cu servicii bancare', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '628', name: 'Alte cheltuieli cu servicii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '641', name: 'Cheltuieli cu salariile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '645', name: 'Cheltuieli cu asigurarile sociale', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '681', name: 'Cheltuieli cu amortizarile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '691', name: 'Cheltuieli cu impozitul pe profit', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },

  // Class 7 - Revenue
  { code: '701', name: 'Venituri din vanzarea produselor finite', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '704', name: 'Venituri din lucrari executate si servicii', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '707', name: 'Venituri din vanzarea marfurilor', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '711', name: 'Venituri aferente costurilor stocurilor', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '722', name: 'Venituri din productia de imobilizari', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '765', name: 'Venituri din diferente de curs valutar', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '766', name: 'Venituri din dobanzi', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '768', name: 'Alte venituri financiare', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
];

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get Chart of Accounts with balances
   */
  async getChartOfAccounts(userId: string): Promise<LedgerAccount[]> {
    // Get all journal entries for this user to calculate balances
    const entries = await this.getJournalEntries(userId);

    // Calculate balances from entries
    const balances = new Map<string, { debit: number; credit: number }>();

    entries.forEach(entry => {
      if (entry.status !== 'POSTED') return;

      entry.lines.forEach(line => {
        const current = balances.get(line.accountCode) || { debit: 0, credit: 0 };
        balances.set(line.accountCode, {
          debit: current.debit + line.debit,
          credit: current.credit + line.credit,
        });
      });
    });

    // Apply balances to accounts
    return ROMANIAN_CHART_OF_ACCOUNTS.map(account => {
      const bal = balances.get(account.code) || { debit: 0, credit: 0 };
      const balance = ['ASSET', 'EXPENSE'].includes(account.type)
        ? bal.debit - bal.credit
        : bal.credit - bal.debit;

      return {
        ...account,
        debit: bal.debit,
        credit: bal.credit,
        balance,
      };
    });
  }

  /**
   * Get General Ledger (detailed account movements)
   */
  async getGeneralLedger(
    userId: string,
    options?: {
      accountCode?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any[]> {
    const entries = await this.getJournalEntries(userId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
    });

    const ledgerEntries: any[] = [];

    entries
      .filter(e => e.status === 'POSTED')
      .forEach(entry => {
        entry.lines
          .filter(line => !options?.accountCode || line.accountCode === options.accountCode)
          .forEach(line => {
            ledgerEntries.push({
              date: entry.date,
              entryId: entry.id,
              description: entry.description,
              reference: entry.reference,
              accountCode: line.accountCode,
              accountName: line.accountName,
              debit: line.debit,
              credit: line.credit,
              lineDescription: line.description,
            });
          });
      });

    return ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get Journal Entries
   */
  async getJournalEntries(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    },
  ): Promise<JournalEntry[]> {
    // In a real implementation, this would fetch from a journal_entries table
    // For now, we'll generate entries from invoices and other documents
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        ...(options?.startDate && options?.endDate && {
          invoiceDate: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }),
      },
    });

    const entries: JournalEntry[] = [];

    invoices.forEach(invoice => {
      const subtotal = Number(invoice.netAmount);
      const vatAmount = Number(invoice.vatAmount);
      const total = Number(invoice.grossAmount);
      const isIssued = invoice.type === 'ISSUED';

      if (isIssued) {
        // Sales invoice entry
        entries.push({
          id: `INV-${invoice.id}`,
          date: invoice.invoiceDate,
          description: `Factura vanzare ${invoice.invoiceNumber} - ${invoice.partnerName}`,
          reference: invoice.invoiceNumber,
          lines: [
            { accountCode: '411', accountName: 'Clienti', debit: total, credit: 0, description: invoice.partnerName },
            { accountCode: '704', accountName: 'Venituri din servicii', debit: 0, credit: subtotal },
            { accountCode: '4427', accountName: 'TVA colectata', debit: 0, credit: vatAmount },
          ],
          status: invoice.paymentStatus === 'PAID' ? 'POSTED' : 'DRAFT',
          createdAt: invoice.createdAt,
        });

        // Payment entry if paid
        if (invoice.paymentStatus === 'PAID') {
          entries.push({
            id: `PAY-${invoice.id}`,
            date: invoice.dueDate || invoice.invoiceDate,
            description: `Incasare factura ${invoice.invoiceNumber}`,
            reference: invoice.invoiceNumber,
            lines: [
              { accountCode: '5121', accountName: 'Conturi la banci', debit: total, credit: 0 },
              { accountCode: '411', accountName: 'Clienti', debit: 0, credit: total },
            ],
            status: 'POSTED',
            createdAt: invoice.updatedAt,
          });
        }
      } else {
        // Purchase invoice entry
        entries.push({
          id: `PINV-${invoice.id}`,
          date: invoice.invoiceDate,
          description: `Factura achizitie ${invoice.invoiceNumber} - ${invoice.partnerName}`,
          reference: invoice.invoiceNumber,
          lines: [
            { accountCode: '628', accountName: 'Alte cheltuieli cu servicii', debit: subtotal, credit: 0 },
            { accountCode: '4426', accountName: 'TVA deductibila', debit: vatAmount, credit: 0 },
            { accountCode: '401', accountName: 'Furnizori', debit: 0, credit: total, description: invoice.partnerName },
          ],
          status: invoice.paymentStatus === 'PAID' ? 'POSTED' : 'DRAFT',
          createdAt: invoice.createdAt,
        });
      }
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Generate Trial Balance (Balanta de Verificare)
   */
  async getTrialBalance(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<TrialBalanceRow[]> {
    const accounts = await this.getChartOfAccounts(userId);
    const entries = await this.getJournalEntries(userId, options);

    // Calculate period movements
    const periodBalances = new Map<string, { debit: number; credit: number }>();

    entries
      .filter(e => e.status === 'POSTED')
      .forEach(entry => {
        entry.lines.forEach(line => {
          const current = periodBalances.get(line.accountCode) || { debit: 0, credit: 0 };
          periodBalances.set(line.accountCode, {
            debit: current.debit + line.debit,
            credit: current.credit + line.credit,
          });
        });
      });

    // Build trial balance
    return accounts
      .filter(acc => {
        const bal = periodBalances.get(acc.code);
        return bal && (bal.debit > 0 || bal.credit > 0);
      })
      .map(acc => {
        const period = periodBalances.get(acc.code) || { debit: 0, credit: 0 };
        const isDebitNature = ['ASSET', 'EXPENSE'].includes(acc.type);

        return {
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: period.debit,
          periodCredit: period.credit,
          closingDebit: isDebitNature ? Math.max(0, period.debit - period.credit) : 0,
          closingCredit: !isDebitNature ? Math.max(0, period.credit - period.debit) : 0,
        };
      });
  }

  /**
   * Generate Balance Sheet (Bilant)
   */
  async getBalanceSheet(
    userId: string,
    asOfDate: Date,
  ): Promise<FinancialStatement> {
    const accounts = await this.getChartOfAccounts(userId);

    const assets = accounts.filter(a => a.type === 'ASSET' && a.balance !== 0);
    const liabilities = accounts.filter(a => a.type === 'LIABILITY' && a.balance !== 0);
    const equity = accounts.filter(a => a.type === 'EQUITY' && a.balance !== 0);

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

    return {
      type: 'BALANCE_SHEET',
      period: { startDate: '', endDate: asOfDate.toISOString().split('T')[0] },
      generatedAt: new Date(),
      data: {
        assets: {
          items: assets.map(a => ({ code: a.code, name: a.name, value: a.balance })),
          total: totalAssets,
        },
        liabilities: {
          items: liabilities.map(a => ({ code: a.code, name: a.name, value: a.balance })),
          total: totalLiabilities,
        },
        equity: {
          items: equity.map(a => ({ code: a.code, name: a.name, value: a.balance })),
          total: totalEquity,
        },
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
    };
  }

  /**
   * Generate Profit & Loss Statement (Cont de Profit si Pierdere)
   */
  async getProfitLoss(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialStatement> {
    const entries = await this.getJournalEntries(userId, { startDate, endDate });

    // Calculate revenue and expenses
    const accountTotals = new Map<string, { code: string; name: string; type: string; amount: number }>();

    entries
      .filter(e => e.status === 'POSTED')
      .forEach(entry => {
        entry.lines.forEach(line => {
          const account = ROMANIAN_CHART_OF_ACCOUNTS.find(a => a.code === line.accountCode);
          if (!account || !['REVENUE', 'EXPENSE'].includes(account.type)) return;

          const current = accountTotals.get(line.accountCode) || {
            code: line.accountCode,
            name: account.name,
            type: account.type,
            amount: 0,
          };

          if (account.type === 'REVENUE') {
            current.amount += line.credit - line.debit;
          } else {
            current.amount += line.debit - line.credit;
          }

          accountTotals.set(line.accountCode, current);
        });
      });

    const items = Array.from(accountTotals.values());
    const revenues = items.filter(i => i.type === 'REVENUE');
    const expenses = items.filter(i => i.type === 'EXPENSE');

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      type: 'PROFIT_LOSS',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      generatedAt: new Date(),
      data: {
        revenues: {
          items: revenues.map(r => ({ code: r.code, name: r.name, value: r.amount })),
          total: totalRevenue,
        },
        expenses: {
          items: expenses.map(e => ({ code: e.code, name: e.name, value: e.amount })),
          total: totalExpenses,
        },
        grossProfit: totalRevenue - expenses.filter(e => e.code.startsWith('6') && e.code < '64').reduce((s, e) => s + e.amount, 0),
        operatingProfit: totalRevenue - expenses.filter(e => e.code.startsWith('6') && e.code < '66').reduce((s, e) => s + e.amount, 0),
        netIncome,
        profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      },
    };
  }

  /**
   * Generate Cash Flow Statement
   */
  async getCashFlow(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialStatement> {
    const entries = await this.getJournalEntries(userId, { startDate, endDate });

    // Analyze cash movements (accounts 5xxx)
    let operatingCashFlow = 0;
    let investingCashFlow = 0;
    let financingCashFlow = 0;

    entries
      .filter(e => e.status === 'POSTED')
      .forEach(entry => {
        entry.lines.forEach(line => {
          if (line.accountCode.startsWith('5')) {
            const cashChange = line.debit - line.credit;

            // Categorize based on counterpart accounts
            const otherLines = entry.lines.filter(l => l.accountCode !== line.accountCode);
            const hasRevenueExpense = otherLines.some(l => l.accountCode.startsWith('6') || l.accountCode.startsWith('7'));
            const hasFixedAssets = otherLines.some(l => l.accountCode.startsWith('2'));
            const hasCapital = otherLines.some(l => l.accountCode.startsWith('1'));

            if (hasCapital) {
              financingCashFlow += cashChange;
            } else if (hasFixedAssets) {
              investingCashFlow += cashChange;
            } else if (hasRevenueExpense || otherLines.some(l => l.accountCode.startsWith('4'))) {
              operatingCashFlow += cashChange;
            }
          }
        });
      });

    const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;

    return {
      type: 'CASH_FLOW',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      generatedAt: new Date(),
      data: {
        operatingActivities: {
          total: operatingCashFlow,
          items: [],
        },
        investingActivities: {
          total: investingCashFlow,
          items: [],
        },
        financingActivities: {
          total: financingCashFlow,
          items: [],
        },
        netCashChange,
      },
    };
  }

  /**
   * Year-End Closing Wizard (Inchidere An Fiscal)
   * Generates all required reports and closing entries for the fiscal year
   */
  async initiateYearEndClosing(userId: string, fiscalYear: number): Promise<{
    fiscalYear: number;
    status: 'initiated' | 'in_progress' | 'completed' | 'error';
    steps: Array<{
      step: number;
      name: string;
      status: 'pending' | 'in_progress' | 'completed' | 'error';
      description: string;
      result?: any;
      error?: string;
    }>;
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      netIncome: number;
      taxableIncome: number;
      estimatedTax: number;
      retainedEarnings: number;
    };
    closingJournalEntries: JournalEntry[];
    requiredDocuments: Array<{
      name: string;
      status: 'generated' | 'pending' | 'error';
      downloadUrl?: string;
    }>;
  }> {
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59);

    const steps: any[] = [];
    const closingJournalEntries: JournalEntry[] = [];
    const requiredDocuments: any[] = [];

    // Step 1: Verify all transactions are posted
    steps.push({
      step: 1,
      name: 'Verificare tranzactii',
      status: 'in_progress',
      description: 'Verificarea ca toate tranzactiile sunt inregistrate si postate',
    });

    const entries = await this.getJournalEntries(userId, { startDate, endDate });
    const draftEntries = entries.filter(e => e.status === 'DRAFT');

    if (draftEntries.length > 0) {
      steps[0].status = 'error';
      steps[0].error = `${draftEntries.length} tranzactii in stare draft. Postati toate tranzactiile inainte de inchidere.`;
    } else {
      steps[0].status = 'completed';
      steps[0].result = { totalEntries: entries.length, postedEntries: entries.filter(e => e.status === 'POSTED').length };
    }

    // Step 2: Generate Trial Balance
    steps.push({
      step: 2,
      name: 'Balanta de verificare',
      status: 'in_progress',
      description: 'Generare balanta de verificare pentru anul fiscal',
    });

    try {
      const trialBalance = await this.getTrialBalance(userId, { startDate, endDate });
      const totalDebit = trialBalance.reduce((sum, row) => sum + row.closingDebit, 0);
      const totalCredit = trialBalance.reduce((sum, row) => sum + row.closingCredit, 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      steps[1].status = isBalanced ? 'completed' : 'error';
      steps[1].result = { accounts: trialBalance.length, totalDebit, totalCredit, isBalanced };
      if (!isBalanced) {
        steps[1].error = `Balanta nu este echilibrata: diferenta de ${Math.abs(totalDebit - totalCredit).toFixed(2)} RON`;
      }

      requiredDocuments.push({
        name: 'Balanta de Verificare',
        status: 'generated',
      });
    } catch (error: any) {
      steps[1].status = 'error';
      steps[1].error = error.message;
    }

    // Step 3: Calculate Profit/Loss
    steps.push({
      step: 3,
      name: 'Calculare profit/pierdere',
      status: 'in_progress',
      description: 'Calcularea rezultatului exercitiului financiar',
    });

    let netIncome = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    try {
      const profitLoss = await this.getProfitLoss(userId, startDate, endDate);
      totalRevenue = profitLoss.data.revenues.total;
      totalExpenses = profitLoss.data.expenses.total;
      netIncome = profitLoss.data.netIncome;

      steps[2].status = 'completed';
      steps[2].result = { totalRevenue, totalExpenses, netIncome };

      requiredDocuments.push({
        name: 'Cont de Profit si Pierdere',
        status: 'generated',
      });
    } catch (error: any) {
      steps[2].status = 'error';
      steps[2].error = error.message;
    }

    // Step 4: Close temporary accounts (Revenue/Expense to P&L)
    steps.push({
      step: 4,
      name: 'Inchidere conturi temporare',
      status: 'in_progress',
      description: 'Transferarea soldurilor conturilor de venituri si cheltuieli in contul de profit/pierdere',
    });

    try {
      const accounts = await this.getChartOfAccounts(userId);
      const revenueAccounts = accounts.filter(a => a.type === 'REVENUE' && a.balance !== 0);
      const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE' && a.balance !== 0);

      // Close revenue accounts (debit revenue, credit P&L 121)
      if (revenueAccounts.length > 0) {
        closingJournalEntries.push({
          id: `CLOSE-REV-${fiscalYear}`,
          date: endDate,
          description: `Inchidere conturi venituri an ${fiscalYear}`,
          reference: `CLOSE-${fiscalYear}`,
          lines: [
            ...revenueAccounts.map(a => ({
              accountCode: a.code,
              accountName: a.name,
              debit: a.balance,
              credit: 0,
              description: `Inchidere ${a.name}`,
            })),
            {
              accountCode: '121',
              accountName: 'Profit sau pierdere',
              debit: 0,
              credit: revenueAccounts.reduce((sum, a) => sum + a.balance, 0),
              description: 'Transfer venituri',
            },
          ],
          status: 'DRAFT',
          createdAt: new Date(),
        });
      }

      // Close expense accounts (debit P&L 121, credit expense)
      if (expenseAccounts.length > 0) {
        closingJournalEntries.push({
          id: `CLOSE-EXP-${fiscalYear}`,
          date: endDate,
          description: `Inchidere conturi cheltuieli an ${fiscalYear}`,
          reference: `CLOSE-${fiscalYear}`,
          lines: [
            {
              accountCode: '121',
              accountName: 'Profit sau pierdere',
              debit: expenseAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0),
              credit: 0,
              description: 'Transfer cheltuieli',
            },
            ...expenseAccounts.map(a => ({
              accountCode: a.code,
              accountName: a.name,
              debit: 0,
              credit: Math.abs(a.balance),
              description: `Inchidere ${a.name}`,
            })),
          ],
          status: 'DRAFT',
          createdAt: new Date(),
        });
      }

      steps[3].status = 'completed';
      steps[3].result = {
        revenueAccountsClosed: revenueAccounts.length,
        expenseAccountsClosed: expenseAccounts.length,
        closingEntriesGenerated: closingJournalEntries.length,
      };
    } catch (error: any) {
      steps[3].status = 'error';
      steps[3].error = error.message;
    }

    // Step 5: Calculate and accrue income tax
    steps.push({
      step: 5,
      name: 'Calculare impozit pe profit',
      status: 'in_progress',
      description: 'Calcularea impozitului pe profit conform legislatiei in vigoare',
    });

    const taxRate = 0.16; // 16% corporate tax rate in Romania
    const taxableIncome = Math.max(0, netIncome);
    const estimatedTax = Math.round(taxableIncome * taxRate * 100) / 100;

    try {
      if (estimatedTax > 0) {
        closingJournalEntries.push({
          id: `TAX-${fiscalYear}`,
          date: endDate,
          description: `Impozit pe profit an ${fiscalYear}`,
          reference: `TAX-${fiscalYear}`,
          lines: [
            {
              accountCode: '691',
              accountName: 'Cheltuieli cu impozitul pe profit',
              debit: estimatedTax,
              credit: 0,
            },
            {
              accountCode: '441',
              accountName: 'Impozit pe profit',
              debit: 0,
              credit: estimatedTax,
            },
          ],
          status: 'DRAFT',
          createdAt: new Date(),
        });
      }

      steps[4].status = 'completed';
      steps[4].result = { taxableIncome, taxRate: `${taxRate * 100}%`, estimatedTax };
    } catch (error: any) {
      steps[4].status = 'error';
      steps[4].error = error.message;
    }

    // Step 6: Transfer to retained earnings
    steps.push({
      step: 6,
      name: 'Transfer rezultat reportat',
      status: 'in_progress',
      description: 'Transferul rezultatului exercitiului in rezultatul reportat',
    });

    const retainedEarnings = netIncome - estimatedTax;

    try {
      if (retainedEarnings !== 0) {
        closingJournalEntries.push({
          id: `RETAIN-${fiscalYear}`,
          date: new Date(fiscalYear + 1, 0, 1), // First day of next year
          description: `Transfer rezultat reportat an ${fiscalYear}`,
          reference: `RETAIN-${fiscalYear}`,
          lines: retainedEarnings > 0 ? [
            {
              accountCode: '121',
              accountName: 'Profit sau pierdere',
              debit: retainedEarnings,
              credit: 0,
            },
            {
              accountCode: '117',
              accountName: 'Rezultatul reportat',
              debit: 0,
              credit: retainedEarnings,
            },
          ] : [
            {
              accountCode: '117',
              accountName: 'Rezultatul reportat',
              debit: Math.abs(retainedEarnings),
              credit: 0,
            },
            {
              accountCode: '121',
              accountName: 'Profit sau pierdere',
              debit: 0,
              credit: Math.abs(retainedEarnings),
            },
          ],
          status: 'DRAFT',
          createdAt: new Date(),
        });
      }

      steps[5].status = 'completed';
      steps[5].result = { retainedEarnings, isProfit: retainedEarnings > 0 };
    } catch (error: any) {
      steps[5].status = 'error';
      steps[5].error = error.message;
    }

    // Step 7: Generate Balance Sheet
    steps.push({
      step: 7,
      name: 'Generare bilant',
      status: 'in_progress',
      description: 'Generarea bilantului contabil la sfarsitul anului fiscal',
    });

    try {
      const balanceSheet = await this.getBalanceSheet(userId, endDate);
      steps[6].status = 'completed';
      steps[6].result = {
        totalAssets: balanceSheet.data.assets.total,
        totalLiabilities: balanceSheet.data.liabilities.total,
        totalEquity: balanceSheet.data.equity.total,
        isBalanced: balanceSheet.data.balanced,
      };

      requiredDocuments.push({
        name: 'Bilant Contabil',
        status: 'generated',
      });
    } catch (error: any) {
      steps[6].status = 'error';
      steps[6].error = error.message;
    }

    // Add required regulatory documents
    requiredDocuments.push(
      { name: 'Declaratie 101 - Impozit pe Profit', status: 'pending' },
      { name: 'Situatii Financiare Anuale', status: 'pending' },
      { name: 'Raport Administrator', status: 'pending' },
    );

    const hasErrors = steps.some(s => s.status === 'error');
    const allCompleted = steps.every(s => s.status === 'completed');

    return {
      fiscalYear,
      status: hasErrors ? 'error' : allCompleted ? 'completed' : 'in_progress',
      steps,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        taxableIncome,
        estimatedTax,
        retainedEarnings,
      },
      closingJournalEntries,
      requiredDocuments,
    };
  }

  /**
   * Get Year-End Closing checklist
   */
  async getYearEndChecklist(userId: string, fiscalYear: number): Promise<{
    fiscalYear: number;
    checklist: Array<{
      category: string;
      items: Array<{
        task: string;
        status: 'completed' | 'pending' | 'not_applicable';
        dueDate?: string;
        notes?: string;
      }>;
    }>;
    deadlines: Array<{
      deadline: string;
      description: string;
      status: 'upcoming' | 'due_soon' | 'overdue';
    }>;
  }> {
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31);

    // Check various completion statuses
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
      },
    });

    const draftInvoices = invoices.filter(i => i.status === 'DRAFT');
    const unpaidInvoices = invoices.filter(i => i.paymentStatus !== 'PAID' && i.type === 'ISSUED');

    const now = new Date();
    const deadlineDate = new Date(fiscalYear + 1, 2, 31); // March 31 of next year for annual filings

    return {
      fiscalYear,
      checklist: [
        {
          category: 'Facturi si Documente',
          items: [
            {
              task: 'Toate facturile emise inregistrate',
              status: draftInvoices.length === 0 ? 'completed' : 'pending',
              notes: draftInvoices.length > 0 ? `${draftInvoices.length} facturi in draft` : undefined,
            },
            {
              task: 'Reconciliere plati clienti',
              status: unpaidInvoices.length === 0 ? 'completed' : 'pending',
              notes: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} facturi neincasate` : undefined,
            },
            { task: 'Verificare documente furnizori', status: 'pending' },
            { task: 'Inventar stocuri', status: 'pending' },
          ],
        },
        {
          category: 'Declaratii Fiscale',
          items: [
            { task: 'D300 - TVA luna decembrie', status: 'pending', dueDate: `${fiscalYear + 1}-01-25` },
            { task: 'D390 - Recapitulativa TVA', status: 'pending', dueDate: `${fiscalYear + 1}-01-25` },
            { task: 'D112 - Salarii decembrie', status: 'pending', dueDate: `${fiscalYear + 1}-01-25` },
            { task: 'D100 - Impozit pe profit T4', status: 'pending', dueDate: `${fiscalYear + 1}-01-25` },
          ],
        },
        {
          category: 'Inchidere Contabila',
          items: [
            { task: 'Balanta de verificare finala', status: 'pending' },
            { task: 'Inchidere conturi venituri/cheltuieli', status: 'pending' },
            { task: 'Calculare impozit pe profit anual', status: 'pending' },
            { task: 'Transfer rezultat reportat', status: 'pending' },
          ],
        },
        {
          category: 'Rapoarte si Situatii Financiare',
          items: [
            { task: 'Bilant contabil', status: 'pending' },
            { task: 'Cont de profit si pierdere', status: 'pending' },
            { task: 'Situatia fluxurilor de trezorerie', status: 'pending' },
            { task: 'Note explicative', status: 'pending' },
            { task: 'Raportul administratorului', status: 'pending' },
          ],
        },
        {
          category: 'Depuneri la Autoritati',
          items: [
            { task: 'Declaratie 101 - Impozit pe profit anual', status: 'pending', dueDate: `${fiscalYear + 1}-03-25` },
            { task: 'Situatii financiare la ONRC/MFP', status: 'pending', dueDate: `${fiscalYear + 1}-05-31` },
          ],
        },
      ],
      deadlines: [
        {
          deadline: `${fiscalYear + 1}-01-25`,
          description: 'Termen declaratii lunare decembrie (D300, D112, D100)',
          status: now > new Date(fiscalYear + 1, 0, 25) ? 'overdue' :
                  now > new Date(fiscalYear + 1, 0, 15) ? 'due_soon' : 'upcoming',
        },
        {
          deadline: `${fiscalYear + 1}-03-25`,
          description: 'Declaratie 101 - Impozit pe profit anual',
          status: now > new Date(fiscalYear + 1, 2, 25) ? 'overdue' :
                  now > new Date(fiscalYear + 1, 2, 15) ? 'due_soon' : 'upcoming',
        },
        {
          deadline: `${fiscalYear + 1}-05-31`,
          description: 'Depunere situatii financiare anuale',
          status: now > new Date(fiscalYear + 1, 4, 31) ? 'overdue' :
                  now > new Date(fiscalYear + 1, 4, 15) ? 'due_soon' : 'upcoming',
        },
      ],
    };
  }

  // =================== PROFIT MARGIN ANALYSIS ===================

  /**
   * Comprehensive profit margin analysis (Analiza marjei de profit)
   * Calculates gross, operating, and net margins with trends
   */
  async getProfitMarginAnalysis(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'month' | 'quarter' | 'year';
      compareWithPrevious?: boolean;
    } = {},
  ): Promise<{
    summary: {
      grossMargin: number;
      operatingMargin: number;
      netMargin: number;
      ebitdaMargin: number;
    };
    breakdown: {
      revenue: number;
      costOfGoodsSold: number;
      grossProfit: number;
      operatingExpenses: number;
      operatingProfit: number;
      financialExpenses: number;
      taxExpense: number;
      netProfit: number;
      ebitda: number;
    };
    trends: {
      period: string;
      grossMargin: number;
      operatingMargin: number;
      netMargin: number;
      ebitdaMargin: number;
    }[];
    comparison?: {
      previousPeriod: {
        grossMargin: number;
        operatingMargin: number;
        netMargin: number;
      };
      changes: {
        grossMarginChange: number;
        operatingMarginChange: number;
        netMarginChange: number;
      };
    };
    byCategory: {
      category: string;
      revenue: number;
      cost: number;
      margin: number;
      marginPercent: number;
    }[];
    insights: string[];
    recommendations: string[];
  }> {
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getFullYear(), 0, 1);
    const groupBy = options.groupBy || 'month';

    // Get invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
      },
      include: {
        items: true,
      },
    });

    // Get payments for the period as expense proxy
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { userId },
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    // Calculate totals
    const revenue = invoices.reduce((sum, inv) => sum + inv.netAmount.toNumber(), 0);

    // Estimate expenses from payment patterns and industry ratios
    // In real production, this would come from an Expense model
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount?.toNumber() || 0), 0);

    // Categorize expenses using industry-standard ratios
    // For SMBs: COGS ~40%, Operating ~25%, Personnel ~20%, Financial ~5%, Depreciation ~5%, Tax ~5%
    const estimatedTotalExpenses = revenue * 0.75; // Assume 75% expense ratio for estimation

    const expenseCategories = {
      cogs: estimatedTotalExpenses * 0.40, // Cost of Goods Sold (accounts 60x)
      operating: estimatedTotalExpenses * 0.15, // Operating expenses (accounts 61x-65x)
      personnel: estimatedTotalExpenses * 0.25, // Personnel costs (accounts 64x)
      financial: estimatedTotalExpenses * 0.05, // Financial expenses (accounts 66x)
      depreciation: estimatedTotalExpenses * 0.08, // Depreciation (accounts 68x)
      tax: estimatedTotalExpenses * 0.07, // Tax expenses (accounts 69x)
    };

    // Calculate profits
    const grossProfit = revenue - expenseCategories.cogs;
    const operatingExpenses = expenseCategories.operating + expenseCategories.personnel;
    const operatingProfit = grossProfit - operatingExpenses;
    const ebitda = operatingProfit + expenseCategories.depreciation;
    const profitBeforeTax = operatingProfit - expenseCategories.financial;
    const taxExpense = profitBeforeTax > 0 ? profitBeforeTax * 0.16 : 0; // 16% corporate tax
    const netProfit = profitBeforeTax - taxExpense;

    // Calculate margins
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const operatingMargin = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    // Calculate trends by period
    const trends = await this.calculateMarginTrends(userId, startDate, endDate, groupBy);

    // Calculate category breakdown (using invoices and estimated expense ratio)
    const byCategory = await this.calculateMarginByCategory(invoices, 0.75);

    // Generate insights
    const insights = this.generateMarginInsights(grossMargin, operatingMargin, netMargin, trends);

    // Generate recommendations
    const recommendations = this.generateMarginRecommendations(
      grossMargin, operatingMargin, netMargin, expenseCategories, revenue
    );

    // Calculate comparison with previous period if requested
    let comparison;
    if (options.compareWithPrevious) {
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

      const prevAnalysis = await this.getProfitMarginAnalysis(userId, {
        startDate: prevStartDate,
        endDate: prevEndDate,
        compareWithPrevious: false,
      });

      comparison = {
        previousPeriod: {
          grossMargin: prevAnalysis.summary.grossMargin,
          operatingMargin: prevAnalysis.summary.operatingMargin,
          netMargin: prevAnalysis.summary.netMargin,
        },
        changes: {
          grossMarginChange: grossMargin - prevAnalysis.summary.grossMargin,
          operatingMarginChange: operatingMargin - prevAnalysis.summary.operatingMargin,
          netMarginChange: netMargin - prevAnalysis.summary.netMargin,
        },
      };
    }

    return {
      summary: {
        grossMargin: Math.round(grossMargin * 100) / 100,
        operatingMargin: Math.round(operatingMargin * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100,
        ebitdaMargin: Math.round(ebitdaMargin * 100) / 100,
      },
      breakdown: {
        revenue: Math.round(revenue * 100) / 100,
        costOfGoodsSold: Math.round(expenseCategories.cogs * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        operatingExpenses: Math.round(operatingExpenses * 100) / 100,
        operatingProfit: Math.round(operatingProfit * 100) / 100,
        financialExpenses: Math.round(expenseCategories.financial * 100) / 100,
        taxExpense: Math.round(taxExpense * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        ebitda: Math.round(ebitda * 100) / 100,
      },
      trends,
      comparison,
      byCategory,
      insights,
      recommendations,
    };
  }

  private async calculateMarginTrends(
    userId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'month' | 'quarter' | 'year',
  ): Promise<{ period: string; grossMargin: number; operatingMargin: number; netMargin: number; ebitdaMargin: number }[]> {
    const trends: { period: string; grossMargin: number; operatingMargin: number; netMargin: number; ebitdaMargin: number }[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      let periodEnd: Date;
      let periodLabel: string;

      switch (groupBy) {
        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          periodLabel = current.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' });
          break;
        case 'quarter':
          const quarterMonth = Math.floor(current.getMonth() / 3) * 3;
          periodEnd = new Date(current.getFullYear(), quarterMonth + 3, 0);
          periodLabel = `T${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`;
          break;
        case 'year':
          periodEnd = new Date(current.getFullYear(), 11, 31);
          periodLabel = `${current.getFullYear()}`;
          break;
      }

      // Get invoices for period
      const invoices = await this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: { gte: current, lte: periodEnd },
          status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
        },
      });

      const revenue = invoices.reduce((sum, inv) => sum + inv.netAmount.toNumber(), 0);
      const totalExpenses = revenue * 0.75; // Estimate 75% expense ratio

      // Simplified calculations for trends
      const cogs = totalExpenses * 0.4; // Estimate 40% as COGS
      const operating = totalExpenses * 0.35; // 35% as operating
      const grossProfit = revenue - cogs;
      const operatingProfit = grossProfit - operating;
      const netProfit = operatingProfit * 0.84; // After 16% tax
      const ebitda = operatingProfit * 1.1; // Add back depreciation estimate

      trends.push({
        period: periodLabel,
        grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
        operatingMargin: revenue > 0 ? Math.round((operatingProfit / revenue) * 10000) / 100 : 0,
        netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0,
        ebitdaMargin: revenue > 0 ? Math.round((ebitda / revenue) * 10000) / 100 : 0,
      });

      // Move to next period
      switch (groupBy) {
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarter':
          current.setMonth(current.getMonth() + 3);
          break;
        case 'year':
          current.setFullYear(current.getFullYear() + 1);
          break;
      }
    }

    return trends;
  }

  private async calculateMarginByCategory(
    invoices: any[],
    expenseRatio: number,
  ): Promise<{ category: string; revenue: number; cost: number; margin: number; marginPercent: number }[]> {
    const categoryMap = new Map<string, { revenue: number; cost: number }>();

    // Aggregate by category from invoice items
    invoices.forEach(inv => {
      if (inv.items) {
        inv.items.forEach((item: any) => {
          const category = item.description?.split(' - ')[0] || 'General';
          const existing = categoryMap.get(category) || { revenue: 0, cost: 0 };
          existing.revenue += item.totalAmount?.toNumber?.() || item.totalAmount || 0;
          categoryMap.set(category, existing);
        });
      } else {
        const category = 'General';
        const existing = categoryMap.get(category) || { revenue: 0, cost: 0 };
        existing.revenue += inv.netAmount.toNumber();
        categoryMap.set(category, existing);
      }
    });

    const results: { category: string; revenue: number; cost: number; margin: number; marginPercent: number }[] = [];

    categoryMap.forEach((values, category) => {
      // Apply expense ratio proportionally to each category
      const proportionalCost = values.revenue * expenseRatio;
      const margin = values.revenue - proportionalCost;

      results.push({
        category,
        revenue: Math.round(values.revenue * 100) / 100,
        cost: Math.round(proportionalCost * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPercent: values.revenue > 0
          ? Math.round((margin / values.revenue) * 10000) / 100
          : 0,
      });
    });

    return results.sort((a, b) => b.revenue - a.revenue);
  }

  private generateMarginInsights(
    grossMargin: number,
    operatingMargin: number,
    netMargin: number,
    trends: { period: string; grossMargin: number; operatingMargin: number; netMargin: number }[],
  ): string[] {
    const insights: string[] = [];

    // Gross margin insights
    if (grossMargin > 40) {
      insights.push('Marja brută excelentă (>40%) - poziție competitivă puternică');
    } else if (grossMargin > 25) {
      insights.push('Marja brută sănătoasă (25-40%) - performanță bună');
    } else if (grossMargin > 15) {
      insights.push('Marja brută moderată (15-25%) - oportunități de optimizare');
    } else {
      insights.push('Marja brută scăzută (<15%) - necesită atenție urgentă');
    }

    // Operating margin insights
    if (operatingMargin > 20) {
      insights.push('Eficiență operațională ridicată - costuri bine gestionate');
    } else if (operatingMargin < 10) {
      insights.push('Marjă operațională redusă - revizuirea costurilor operaționale recomandată');
    }

    // Net margin insights
    if (netMargin > 15) {
      insights.push('Rentabilitate netă foarte bună pentru reinvestire');
    } else if (netMargin < 5) {
      insights.push('Marjă netă scăzută - vulnerabilitate la fluctuații de piață');
    }

    // Trend analysis
    if (trends.length >= 3) {
      const recentTrend = trends.slice(-3);
      const marginTrend = recentTrend[2].netMargin - recentTrend[0].netMargin;

      if (marginTrend > 2) {
        insights.push('Trend ascendent pozitiv al marjei - îmbunătățire continuă');
      } else if (marginTrend < -2) {
        insights.push('Trend descendent al marjei - analiză cauzelor necesară');
      } else {
        insights.push('Marje stabile în ultimele perioade');
      }
    }

    return insights;
  }

  private generateMarginRecommendations(
    grossMargin: number,
    operatingMargin: number,
    netMargin: number,
    expenseCategories: Record<string, number>,
    revenue: number,
  ): string[] {
    const recommendations: string[] = [];

    // Gross margin recommendations
    if (grossMargin < 25) {
      recommendations.push('Renegociați contractele cu furnizorii pentru costuri mai bune');
      recommendations.push('Analizați posibilitatea creșterii prețurilor sau reducerii discount-urilor');
    }

    // Operating margin recommendations
    if (operatingMargin < 10) {
      const personnelRatio = revenue > 0 ? (expenseCategories.personnel / revenue) * 100 : 0;
      if (personnelRatio > 30) {
        recommendations.push('Costurile de personal sunt ridicate (>' + Math.round(personnelRatio) + '%) - evaluați productivitatea');
      }
      recommendations.push('Identificați și eliminați cheltuielile operaționale neesențiale');
      recommendations.push('Automatizați procesele pentru reducerea costurilor administrative');
    }

    // Financial recommendations
    if (expenseCategories.financial > 0) {
      const financialRatio = revenue > 0 ? (expenseCategories.financial / revenue) * 100 : 0;
      if (financialRatio > 5) {
        recommendations.push('Cheltuielile financiare sunt semnificative - refinanțarea datoriilor poate fi benefică');
      }
    }

    // General recommendations
    if (netMargin > 0 && netMargin < 10) {
      recommendations.push('Diversificați sursele de venit pentru stabilitate');
      recommendations.push('Implementați sisteme de monitorizare a costurilor în timp real');
    }

    if (recommendations.length === 0) {
      recommendations.push('Mențineți strategia actuală - performanța este optimă');
      recommendations.push('Considerați investiții în extindere sau inovare');
    }

    return recommendations;
  }

  /**
   * Get contribution margin analysis (Analiza marjei de contribuție)
   */
  async getContributionMarginAnalysis(
    userId: string,
    options: { startDate?: Date; endDate?: Date } = {},
  ): Promise<{
    products: {
      name: string;
      revenue: number;
      variableCost: number;
      contributionMargin: number;
      contributionMarginRatio: number;
      salesMix: number;
    }[];
    total: {
      revenue: number;
      variableCosts: number;
      fixedCosts: number;
      contributionMargin: number;
      contributionMarginRatio: number;
      netProfit: number;
    };
    breakEvenAnalysis: {
      breakEvenRevenue: number;
      breakEvenUnits: number;
      marginOfSafety: number;
      marginOfSafetyRatio: number;
    };
  }> {
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getFullYear(), 0, 1);

    // Get invoices with items
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
      },
      include: { items: true },
    });

    // Calculate total revenue first
    const totalInvoiceRevenue = invoices.reduce((sum, inv) => sum + inv.netAmount.toNumber(), 0);

    // Estimate costs using industry ratios (in production would come from Expense model)
    const estimatedTotalExpenses = totalInvoiceRevenue * 0.75;
    const variableCosts = estimatedTotalExpenses * 0.45; // ~45% variable (COGS, commissions, materials)
    const fixedCosts = estimatedTotalExpenses * 0.55; // ~55% fixed (salaries, rent, utilities, depreciation)

    // Aggregate by product/service
    const productMap = new Map<string, { revenue: number; quantity: number }>();

    invoices.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: any) => {
          const name = item.description || 'Serviciu General';
          const existing = productMap.get(name) || { revenue: 0, quantity: 0 };
          existing.revenue += item.totalAmount?.toNumber?.() || item.totalAmount || 0;
          existing.quantity += item.quantity?.toNumber?.() || item.quantity || 1;
          productMap.set(name, existing);
        });
      } else {
        const name = 'Serviciu General';
        const existing = productMap.get(name) || { revenue: 0, quantity: 0 };
        existing.revenue += inv.netAmount.toNumber();
        existing.quantity += 1;
        productMap.set(name, existing);
      }
    });

    const totalRevenue = Array.from(productMap.values()).reduce((sum, p) => sum + p.revenue, 0);

    // Estimate variable cost per product (proportional)
    const variableCostRatio = totalRevenue > 0 ? variableCosts / totalRevenue : 0;

    const products = Array.from(productMap.entries()).map(([name, data]) => {
      const productVariableCost = data.revenue * variableCostRatio;
      const contributionMargin = data.revenue - productVariableCost;

      return {
        name,
        revenue: Math.round(data.revenue * 100) / 100,
        variableCost: Math.round(productVariableCost * 100) / 100,
        contributionMargin: Math.round(contributionMargin * 100) / 100,
        contributionMarginRatio: data.revenue > 0
          ? Math.round((contributionMargin / data.revenue) * 10000) / 100
          : 0,
        salesMix: totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 10000) / 100
          : 0,
      };
    }).sort((a, b) => b.contributionMargin - a.contributionMargin);

    const totalContributionMargin = totalRevenue - variableCosts;
    const contributionMarginRatio = totalRevenue > 0 ? totalContributionMargin / totalRevenue : 0;
    const netProfit = totalContributionMargin - fixedCosts;

    // Break-even analysis
    const breakEvenRevenue = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0;
    const avgRevenuePerUnit = products.length > 0
      ? totalRevenue / products.reduce((sum, p) => sum + 1, 0)
      : 1;
    const breakEvenUnits = avgRevenuePerUnit > 0 ? breakEvenRevenue / avgRevenuePerUnit : 0;
    const marginOfSafety = totalRevenue - breakEvenRevenue;
    const marginOfSafetyRatio = totalRevenue > 0 ? (marginOfSafety / totalRevenue) * 100 : 0;

    return {
      products,
      total: {
        revenue: Math.round(totalRevenue * 100) / 100,
        variableCosts: Math.round(variableCosts * 100) / 100,
        fixedCosts: Math.round(fixedCosts * 100) / 100,
        contributionMargin: Math.round(totalContributionMargin * 100) / 100,
        contributionMarginRatio: Math.round(contributionMarginRatio * 10000) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      },
      breakEvenAnalysis: {
        breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
        breakEvenUnits: Math.round(breakEvenUnits),
        marginOfSafety: Math.round(marginOfSafety * 100) / 100,
        marginOfSafetyRatio: Math.round(marginOfSafetyRatio * 100) / 100,
      },
    };
  }

  // =================== FINANCIAL RATIOS DASHBOARD ===================

  /**
   * Comprehensive financial ratios analysis (Analiza indicatorilor financiari)
   * Calculates liquidity, solvency, profitability, and efficiency ratios
   */
  async getFinancialRatios(
    userId: string,
    options: {
      asOfDate?: Date;
      compareWithPrevious?: boolean;
    } = {},
  ): Promise<{
    asOfDate: string;
    liquidity: {
      currentRatio: number;
      quickRatio: number;
      cashRatio: number;
      workingCapital: number;
      workingCapitalRatio: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
      insights: string[];
    };
    solvency: {
      debtToEquity: number;
      debtToAssets: number;
      equityRatio: number;
      interestCoverage: number;
      longTermDebtRatio: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
      insights: string[];
    };
    profitability: {
      grossProfitMargin: number;
      operatingProfitMargin: number;
      netProfitMargin: number;
      returnOnAssets: number;
      returnOnEquity: number;
      returnOnCapitalEmployed: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
      insights: string[];
    };
    efficiency: {
      assetTurnover: number;
      inventoryTurnover: number;
      receivablesTurnover: number;
      payablesTurnover: number;
      daysInventoryOutstanding: number;
      daysSalesOutstanding: number;
      daysPayablesOutstanding: number;
      cashConversionCycle: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
      insights: string[];
    };
    overallScore: {
      score: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      summary: string;
    };
    comparison?: {
      previousPeriod: {
        currentRatio: number;
        debtToEquity: number;
        netProfitMargin: number;
        returnOnEquity: number;
      };
      changes: {
        currentRatioChange: number;
        debtToEquityChange: number;
        netProfitMarginChange: number;
        returnOnEquityChange: number;
      };
    };
    benchmarks: {
      industry: string;
      currentRatioIndustryAvg: number;
      debtToEquityIndustryAvg: number;
      netProfitMarginIndustryAvg: number;
      performanceVsIndustry: 'above' | 'at' | 'below';
    };
    recommendations: string[];
  }> {
    const asOfDate = options.asOfDate || new Date();
    const startOfYear = new Date(asOfDate.getFullYear(), 0, 1);

    // Get balance sheet data
    const balanceSheet = await this.getBalanceSheet(userId, asOfDate);

    // Get profit & loss data
    const profitLoss = await this.getProfitLoss(userId, startOfYear, asOfDate);

    // Extract values from balance sheet
    const currentAssets = balanceSheet.data.assets.currentAssets?.total || 0;
    const totalAssets = balanceSheet.data.assets.total || 0;
    const currentLiabilities = balanceSheet.data.liabilities.currentLiabilities?.total || 0;
    const totalLiabilities = balanceSheet.data.liabilities.total || 0;
    const totalEquity = balanceSheet.data.equity.total || 0;
    const cash = balanceSheet.data.assets.currentAssets?.items?.find(
      (i: any) => i.accountCode?.startsWith('512') || i.name?.toLowerCase().includes('cash') || i.name?.toLowerCase().includes('numerar')
    )?.balance || currentAssets * 0.15; // Estimate if not found
    const inventory = balanceSheet.data.assets.currentAssets?.items?.find(
      (i: any) => i.accountCode?.startsWith('3') || i.name?.toLowerCase().includes('stoc') || i.name?.toLowerCase().includes('inventory')
    )?.balance || currentAssets * 0.25;
    const receivables = balanceSheet.data.assets.currentAssets?.items?.find(
      (i: any) => i.accountCode?.startsWith('41') || i.name?.toLowerCase().includes('client') || i.name?.toLowerCase().includes('receivable')
    )?.balance || currentAssets * 0.4;
    const longTermDebt = totalLiabilities - currentLiabilities;

    // Extract values from P&L
    const revenue = profitLoss.data.revenues?.total || 0;
    const grossProfit = profitLoss.data.grossProfit || revenue * 0.35;
    const operatingProfit = profitLoss.data.operatingIncome || revenue * 0.15;
    const netIncome = profitLoss.data.netIncome || 0;
    const interestExpense = revenue * 0.02; // Estimate 2% interest expense

    // Cost of goods sold estimation
    const cogs = revenue - grossProfit;
    const purchases = cogs * 0.8; // Estimate purchases as 80% of COGS

    // =================== LIQUIDITY RATIOS ===================
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
    const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;
    const workingCapital = currentAssets - currentLiabilities;
    const workingCapitalRatio = totalAssets > 0 ? workingCapital / totalAssets : 0;

    const liquidityStatus = this.evaluateLiquidityStatus(currentRatio, quickRatio);
    const liquidityInsights = this.generateLiquidityInsights(currentRatio, quickRatio, cashRatio, workingCapital);

    // =================== SOLVENCY RATIOS ===================
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;
    const debtToAssets = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
    const equityRatio = totalAssets > 0 ? totalEquity / totalAssets : 0;
    const interestCoverage = interestExpense > 0 ? operatingProfit / interestExpense : 0;
    const longTermDebtRatio = totalAssets > 0 ? longTermDebt / totalAssets : 0;

    const solvencyStatus = this.evaluateSolvencyStatus(debtToEquity, interestCoverage);
    const solvencyInsights = this.generateSolvencyInsights(debtToEquity, debtToAssets, interestCoverage);

    // =================== PROFITABILITY RATIOS ===================
    const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const operatingProfitMargin = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;
    const netProfitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
    const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
    const capitalEmployed = totalAssets - currentLiabilities;
    const returnOnCapitalEmployed = capitalEmployed > 0 ? (operatingProfit / capitalEmployed) * 100 : 0;

    const profitabilityStatus = this.evaluateProfitabilityStatus(netProfitMargin, returnOnEquity);
    const profitabilityInsights = this.generateProfitabilityInsights(grossProfitMargin, netProfitMargin, returnOnAssets, returnOnEquity);

    // =================== EFFICIENCY RATIOS ===================
    const assetTurnover = totalAssets > 0 ? revenue / totalAssets : 0;
    const inventoryTurnover = inventory > 0 ? cogs / inventory : 0;
    const receivablesTurnover = receivables > 0 ? revenue / receivables : 0;
    const payablesTurnover = currentLiabilities > 0 ? purchases / (currentLiabilities * 0.5) : 0;

    const daysInventoryOutstanding = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;
    const daysSalesOutstanding = receivablesTurnover > 0 ? 365 / receivablesTurnover : 0;
    const daysPayablesOutstanding = payablesTurnover > 0 ? 365 / payablesTurnover : 0;
    const cashConversionCycle = daysInventoryOutstanding + daysSalesOutstanding - daysPayablesOutstanding;

    const efficiencyStatus = this.evaluateEfficiencyStatus(assetTurnover, cashConversionCycle);
    const efficiencyInsights = this.generateEfficiencyInsights(assetTurnover, daysSalesOutstanding, cashConversionCycle);

    // =================== OVERALL SCORE ===================
    const overallScore = this.calculateOverallFinancialScore(
      currentRatio, debtToEquity, netProfitMargin, returnOnEquity, assetTurnover
    );

    // =================== BENCHMARKS ===================
    const benchmarks = {
      industry: 'SMB Romania - Servicii',
      currentRatioIndustryAvg: 1.5,
      debtToEquityIndustryAvg: 1.0,
      netProfitMarginIndustryAvg: 8.0,
      performanceVsIndustry: this.compareWithIndustry(currentRatio, debtToEquity, netProfitMargin) as 'above' | 'at' | 'below',
    };

    // =================== RECOMMENDATIONS ===================
    const recommendations = this.generateFinancialRecommendations(
      currentRatio, quickRatio, debtToEquity, netProfitMargin, returnOnEquity, cashConversionCycle
    );

    // =================== COMPARISON WITH PREVIOUS PERIOD ===================
    let comparison;
    if (options.compareWithPrevious) {
      const previousYear = new Date(asOfDate);
      previousYear.setFullYear(previousYear.getFullYear() - 1);

      try {
        const prevRatios = await this.getFinancialRatios(userId, {
          asOfDate: previousYear,
          compareWithPrevious: false,
        });

        comparison = {
          previousPeriod: {
            currentRatio: prevRatios.liquidity.currentRatio,
            debtToEquity: prevRatios.solvency.debtToEquity,
            netProfitMargin: prevRatios.profitability.netProfitMargin,
            returnOnEquity: prevRatios.profitability.returnOnEquity,
          },
          changes: {
            currentRatioChange: currentRatio - prevRatios.liquidity.currentRatio,
            debtToEquityChange: debtToEquity - prevRatios.solvency.debtToEquity,
            netProfitMarginChange: netProfitMargin - prevRatios.profitability.netProfitMargin,
            returnOnEquityChange: returnOnEquity - prevRatios.profitability.returnOnEquity,
          },
        };
      } catch {
        // Previous period data not available
      }
    }

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      liquidity: {
        currentRatio: Math.round(currentRatio * 100) / 100,
        quickRatio: Math.round(quickRatio * 100) / 100,
        cashRatio: Math.round(cashRatio * 100) / 100,
        workingCapital: Math.round(workingCapital * 100) / 100,
        workingCapitalRatio: Math.round(workingCapitalRatio * 10000) / 100,
        status: liquidityStatus,
        insights: liquidityInsights,
      },
      solvency: {
        debtToEquity: Math.round(debtToEquity * 100) / 100,
        debtToAssets: Math.round(debtToAssets * 100) / 100,
        equityRatio: Math.round(equityRatio * 10000) / 100,
        interestCoverage: Math.round(interestCoverage * 100) / 100,
        longTermDebtRatio: Math.round(longTermDebtRatio * 10000) / 100,
        status: solvencyStatus,
        insights: solvencyInsights,
      },
      profitability: {
        grossProfitMargin: Math.round(grossProfitMargin * 100) / 100,
        operatingProfitMargin: Math.round(operatingProfitMargin * 100) / 100,
        netProfitMargin: Math.round(netProfitMargin * 100) / 100,
        returnOnAssets: Math.round(returnOnAssets * 100) / 100,
        returnOnEquity: Math.round(returnOnEquity * 100) / 100,
        returnOnCapitalEmployed: Math.round(returnOnCapitalEmployed * 100) / 100,
        status: profitabilityStatus,
        insights: profitabilityInsights,
      },
      efficiency: {
        assetTurnover: Math.round(assetTurnover * 100) / 100,
        inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
        receivablesTurnover: Math.round(receivablesTurnover * 100) / 100,
        payablesTurnover: Math.round(payablesTurnover * 100) / 100,
        daysInventoryOutstanding: Math.round(daysInventoryOutstanding),
        daysSalesOutstanding: Math.round(daysSalesOutstanding),
        daysPayablesOutstanding: Math.round(daysPayablesOutstanding),
        cashConversionCycle: Math.round(cashConversionCycle),
        status: efficiencyStatus,
        insights: efficiencyInsights,
      },
      overallScore,
      comparison,
      benchmarks,
      recommendations,
    };
  }

  private evaluateLiquidityStatus(currentRatio: number, quickRatio: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (currentRatio >= 2 && quickRatio >= 1) return 'excellent';
    if (currentRatio >= 1.5 && quickRatio >= 0.8) return 'good';
    if (currentRatio >= 1 && quickRatio >= 0.5) return 'warning';
    return 'critical';
  }

  private evaluateSolvencyStatus(debtToEquity: number, interestCoverage: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (debtToEquity < 0.5 && interestCoverage > 5) return 'excellent';
    if (debtToEquity < 1 && interestCoverage > 3) return 'good';
    if (debtToEquity < 2 && interestCoverage > 1.5) return 'warning';
    return 'critical';
  }

  private evaluateProfitabilityStatus(netProfitMargin: number, returnOnEquity: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (netProfitMargin > 15 && returnOnEquity > 20) return 'excellent';
    if (netProfitMargin > 8 && returnOnEquity > 12) return 'good';
    if (netProfitMargin > 3 && returnOnEquity > 5) return 'warning';
    return 'critical';
  }

  private evaluateEfficiencyStatus(assetTurnover: number, cashConversionCycle: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (assetTurnover > 2 && cashConversionCycle < 30) return 'excellent';
    if (assetTurnover > 1 && cashConversionCycle < 60) return 'good';
    if (assetTurnover > 0.5 && cashConversionCycle < 90) return 'warning';
    return 'critical';
  }

  private generateLiquidityInsights(currentRatio: number, quickRatio: number, cashRatio: number, workingCapital: number): string[] {
    const insights: string[] = [];

    if (currentRatio >= 2) {
      insights.push('Lichiditate curentă excelentă - capacitate solidă de acoperire a obligațiilor pe termen scurt');
    } else if (currentRatio >= 1.5) {
      insights.push('Lichiditate curentă bună - marjă confortabilă pentru obligații curente');
    } else if (currentRatio < 1) {
      insights.push('Lichiditate curentă critică - risc de insolvență pe termen scurt');
    }

    if (quickRatio < 0.8) {
      insights.push('Rata rapidă redusă - dependență mare de vânzarea stocurilor pentru acoperirea datoriilor');
    }

    if (cashRatio < 0.2) {
      insights.push('Rezerve de numerar reduse - considerați creșterea lichidității imediate');
    }

    if (workingCapital < 0) {
      insights.push('Capital de lucru negativ - risc ridicat de întârzieri la plata furnizorilor');
    }

    return insights;
  }

  private generateSolvencyInsights(debtToEquity: number, debtToAssets: number, interestCoverage: number): string[] {
    const insights: string[] = [];

    if (debtToEquity < 0.5) {
      insights.push('Structură de capital conservatoare - nivel scăzut de îndatorare');
    } else if (debtToEquity > 2) {
      insights.push('Grad ridicat de îndatorare - risc financiar crescut');
    }

    if (interestCoverage < 2) {
      insights.push('Acoperire dobânzi limitată - vulnerabilitate la creșterea ratelor');
    } else if (interestCoverage > 5) {
      insights.push('Capacitate excelentă de acoperire a dobânzilor');
    }

    if (debtToAssets > 0.6) {
      insights.push('Activele sunt finanțate predominant prin datorii - risc de solvabilitate');
    }

    return insights;
  }

  private generateProfitabilityInsights(grossMargin: number, netMargin: number, roa: number, roe: number): string[] {
    const insights: string[] = [];

    if (grossMargin > 40) {
      insights.push('Marja brută excelentă - putere de negociere cu furnizorii sau prețuri premium');
    } else if (grossMargin < 20) {
      insights.push('Marja brută scăzută - analizați costurile de producție/achiziție');
    }

    if (netMargin > 15) {
      insights.push('Profitabilitate netă excepțională - eficiență operațională ridicată');
    } else if (netMargin < 5) {
      insights.push('Marja netă redusă - optimizarea costurilor este prioritară');
    }

    if (roe > 20) {
      insights.push('ROE excelent - randament superior al capitalului propriu');
    } else if (roe < 8) {
      insights.push('ROE sub medie - capitalul propriu nu generează randamente competitive');
    }

    if (roa > 10) {
      insights.push('Utilizare eficientă a activelor în generarea profitului');
    }

    return insights;
  }

  private generateEfficiencyInsights(assetTurnover: number, dso: number, ccc: number): string[] {
    const insights: string[] = [];

    if (assetTurnover > 2) {
      insights.push('Rotație excelentă a activelor - utilizare intensivă a resurselor');
    } else if (assetTurnover < 0.5) {
      insights.push('Rotație lentă a activelor - posibile active subutilizate');
    }

    if (dso > 60) {
      insights.push(`Termen mediu de încasare de ${Math.round(dso)} zile - optimizați colectarea creanțelor`);
    } else if (dso < 30) {
      insights.push('Încasări rapide de la clienți - politică de credit eficientă');
    }

    if (ccc > 60) {
      insights.push('Ciclu de conversie numerar lung - capital blocat în operațiuni');
    } else if (ccc < 0) {
      insights.push('Ciclu de conversie negativ - finanțare de către furnizori');
    }

    return insights;
  }

  private calculateOverallFinancialScore(
    currentRatio: number,
    debtToEquity: number,
    netProfitMargin: number,
    returnOnEquity: number,
    assetTurnover: number,
  ): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'; summary: string } {
    // Weight factors
    const weights = { liquidity: 0.2, solvency: 0.2, profitability: 0.35, efficiency: 0.25 };

    // Score each component (0-100)
    const liquidityScore = Math.min(100, (currentRatio / 2) * 100);
    const solvencyScore = Math.min(100, Math.max(0, (2 - debtToEquity) / 2 * 100));
    const profitabilityScore = Math.min(100, Math.max(0, netProfitMargin * 5 + returnOnEquity * 2));
    const efficiencyScore = Math.min(100, assetTurnover * 50);

    const totalScore = Math.round(
      liquidityScore * weights.liquidity +
      solvencyScore * weights.solvency +
      profitabilityScore * weights.profitability +
      efficiencyScore * weights.efficiency
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    let summary: string;

    if (totalScore >= 80) {
      grade = 'A';
      healthStatus = 'excellent';
      summary = 'Sănătate financiară excelentă - compania este bine poziționată pentru creștere';
    } else if (totalScore >= 65) {
      grade = 'B';
      healthStatus = 'good';
      summary = 'Sănătate financiară bună - performanță solidă cu spațiu de îmbunătățire';
    } else if (totalScore >= 50) {
      grade = 'C';
      healthStatus = 'fair';
      summary = 'Sănătate financiară moderată - necesită atenție în anumite domenii';
    } else if (totalScore >= 35) {
      grade = 'D';
      healthStatus = 'poor';
      summary = 'Sănătate financiară slabă - acțiuni corective necesare';
    } else {
      grade = 'F';
      healthStatus = 'critical';
      summary = 'Situație financiară critică - intervenție urgentă necesară';
    }

    return { score: totalScore, grade, healthStatus, summary };
  }

  private compareWithIndustry(currentRatio: number, debtToEquity: number, netProfitMargin: number): string {
    const industryBenchmarks = { currentRatio: 1.5, debtToEquity: 1.0, netProfitMargin: 8 };

    let betterCount = 0;
    if (currentRatio > industryBenchmarks.currentRatio) betterCount++;
    if (debtToEquity < industryBenchmarks.debtToEquity) betterCount++;
    if (netProfitMargin > industryBenchmarks.netProfitMargin) betterCount++;

    if (betterCount >= 2) return 'above';
    if (betterCount === 1) return 'at';
    return 'below';
  }

  private generateFinancialRecommendations(
    currentRatio: number,
    quickRatio: number,
    debtToEquity: number,
    netProfitMargin: number,
    returnOnEquity: number,
    cashConversionCycle: number,
  ): string[] {
    const recommendations: string[] = [];

    // Liquidity recommendations
    if (currentRatio < 1.5) {
      recommendations.push('Îmbunătățiți lichiditatea prin accelerarea încasărilor sau renegocierea termenelor cu furnizorii');
    }
    if (quickRatio < 1) {
      recommendations.push('Reduceți dependența de stocuri pentru plata datoriilor curente');
    }

    // Solvency recommendations
    if (debtToEquity > 1.5) {
      recommendations.push('Considerați reducerea gradului de îndatorare prin plata anticipată a creditelor sau majorare de capital');
    }

    // Profitability recommendations
    if (netProfitMargin < 8) {
      recommendations.push('Analizați structura costurilor pentru identificarea oportunităților de optimizare');
    }
    if (returnOnEquity < 12) {
      recommendations.push('Evaluați utilizarea pârghiei financiare pentru creșterea randamentului capitalului propriu');
    }

    // Efficiency recommendations
    if (cashConversionCycle > 60) {
      recommendations.push('Optimizați ciclul de conversie numerar prin: reducerea stocurilor, accelerarea încasărilor, extinderea termenelor de plată');
    }

    if (recommendations.length === 0) {
      recommendations.push('Indicatorii financiari sunt în parametri optimi - mențineți strategia actuală');
      recommendations.push('Considerați investiții în extindere sau diversificare');
    }

    return recommendations;
  }

  // =================== REVENUE RECOGNITION ===================

  /**
   * Revenue Recognition Module (Recunoașterea Veniturilor)
   * Handles deferred revenue, accrual accounting, and revenue schedules
   * Compliant with IFRS 15 / Romanian accounting standards
   */

  // In-memory storage for revenue recognition (would use Prisma in production)
  private deferredRevenue: Map<string, DeferredRevenueRecord> = new Map();
  private revenueSchedules: Map<string, RevenueSchedule> = new Map();
  private revenueRecognitionRules: Map<string, RevenueRecognitionRule> = new Map();

  /**
   * Create a deferred revenue record for prepaid services
   */
  async createDeferredRevenue(
    userId: string,
    data: {
      invoiceId: string;
      contractId?: string;
      customerId: string;
      customerName: string;
      totalAmount: number;
      currency: string;
      serviceStartDate: Date;
      serviceEndDate: Date;
      recognitionMethod: 'straight_line' | 'milestone' | 'percentage_completion' | 'point_in_time';
      description: string;
      accountCode?: string;
    },
  ): Promise<DeferredRevenueRecord> {
    const id = `dr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Calculate monthly amounts for straight-line recognition
    const months = this.calculateMonthsBetween(data.serviceStartDate, data.serviceEndDate);
    const monthlyAmount = months > 0 ? data.totalAmount / months : data.totalAmount;

    // Generate recognition schedule
    const schedule = this.generateRevenueSchedule(
      data.serviceStartDate,
      data.serviceEndDate,
      data.totalAmount,
      data.recognitionMethod,
    );

    const record: DeferredRevenueRecord = {
      id,
      userId,
      invoiceId: data.invoiceId,
      contractId: data.contractId,
      customerId: data.customerId,
      customerName: data.customerName,
      totalAmount: data.totalAmount,
      recognizedAmount: 0,
      deferredAmount: data.totalAmount,
      currency: data.currency,
      serviceStartDate: data.serviceStartDate,
      serviceEndDate: data.serviceEndDate,
      recognitionMethod: data.recognitionMethod,
      monthlyAmount,
      description: data.description,
      accountCode: data.accountCode || '472', // Venituri înregistrate în avans
      schedule,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.deferredRevenue.set(id, record);
    return record;
  }

  /**
   * Process revenue recognition for a period
   */
  async processRevenueRecognition(
    userId: string,
    period: string, // YYYY-MM format
  ): Promise<{
    processed: number;
    totalRecognized: number;
    journalEntries: {
      id: string;
      date: Date;
      description: string;
      debit: { account: string; amount: number };
      credit: { account: string; amount: number };
    }[];
    details: {
      recordId: string;
      customerName: string;
      amountRecognized: number;
      remainingDeferred: number;
    }[];
  }> {
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const journalEntries: any[] = [];
    const details: any[] = [];
    let totalRecognized = 0;
    let processed = 0;

    // Get all active deferred revenue records for this user
    const records = Array.from(this.deferredRevenue.values()).filter(
      (r) => r.userId === userId && r.status === 'active',
    );

    for (const record of records) {
      // Find the schedule entry for this period
      const scheduleEntry = record.schedule.find((s) => {
        const entryDate = new Date(s.date);
        return (
          entryDate.getFullYear() === year &&
          entryDate.getMonth() === month - 1 &&
          !s.recognized
        );
      });

      if (scheduleEntry && scheduleEntry.amount > 0) {
        // Mark as recognized
        scheduleEntry.recognized = true;
        scheduleEntry.recognizedAt = new Date();

        // Update record
        record.recognizedAmount += scheduleEntry.amount;
        record.deferredAmount -= scheduleEntry.amount;
        record.updatedAt = new Date();

        // Check if fully recognized
        if (record.deferredAmount <= 0.01) {
          record.status = 'fully_recognized';
        }

        // Create journal entry
        journalEntries.push({
          id: `je-rev-${record.id}-${period}`,
          date: periodEnd,
          description: `Recunoaștere venit: ${record.description} - ${record.customerName}`,
          debit: { account: record.accountCode, amount: scheduleEntry.amount },
          credit: { account: '704', amount: scheduleEntry.amount }, // Venituri din servicii
        });

        details.push({
          recordId: record.id,
          customerName: record.customerName,
          amountRecognized: scheduleEntry.amount,
          remainingDeferred: record.deferredAmount,
        });

        totalRecognized += scheduleEntry.amount;
        processed++;

        this.deferredRevenue.set(record.id, record);
      }
    }

    return {
      processed,
      totalRecognized: Math.round(totalRecognized * 100) / 100,
      journalEntries,
      details,
    };
  }

  /**
   * Get deferred revenue summary
   */
  async getDeferredRevenueSummary(userId: string): Promise<{
    totalDeferred: number;
    totalRecognized: number;
    byStatus: { status: string; count: number; amount: number }[];
    byCustomer: { customerId: string; customerName: string; deferredAmount: number }[];
    upcomingRecognition: { period: string; amount: number }[];
    agingAnalysis: {
      current: number;
      oneToThreeMonths: number;
      threeToSixMonths: number;
      sixToTwelveMonths: number;
      overTwelveMonths: number;
    };
  }> {
    const records = Array.from(this.deferredRevenue.values()).filter(
      (r) => r.userId === userId,
    );

    // By status
    const statusMap = new Map<string, { count: number; amount: number }>();
    records.forEach((r) => {
      const existing = statusMap.get(r.status) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += r.deferredAmount;
      statusMap.set(r.status, existing);
    });

    // By customer
    const customerMap = new Map<string, { customerName: string; deferredAmount: number }>();
    records.forEach((r) => {
      if (r.status === 'active') {
        const existing = customerMap.get(r.customerId) || { customerName: r.customerName, deferredAmount: 0 };
        existing.deferredAmount += r.deferredAmount;
        customerMap.set(r.customerId, existing);
      }
    });

    // Upcoming recognition (next 12 months)
    const upcomingMap = new Map<string, number>();
    const now = new Date();
    records
      .filter((r) => r.status === 'active')
      .forEach((r) => {
        r.schedule
          .filter((s) => !s.recognized && new Date(s.date) >= now)
          .slice(0, 12)
          .forEach((s) => {
            const period = new Date(s.date).toISOString().slice(0, 7);
            upcomingMap.set(period, (upcomingMap.get(period) || 0) + s.amount);
          });
      });

    // Aging analysis
    const aging = {
      current: 0,
      oneToThreeMonths: 0,
      threeToSixMonths: 0,
      sixToTwelveMonths: 0,
      overTwelveMonths: 0,
    };

    records
      .filter((r) => r.status === 'active')
      .forEach((r) => {
        const endDate = new Date(r.serviceEndDate);
        const monthsRemaining = this.calculateMonthsBetween(now, endDate);

        if (monthsRemaining <= 1) {
          aging.current += r.deferredAmount;
        } else if (monthsRemaining <= 3) {
          aging.oneToThreeMonths += r.deferredAmount;
        } else if (monthsRemaining <= 6) {
          aging.threeToSixMonths += r.deferredAmount;
        } else if (monthsRemaining <= 12) {
          aging.sixToTwelveMonths += r.deferredAmount;
        } else {
          aging.overTwelveMonths += r.deferredAmount;
        }
      });

    return {
      totalDeferred: Math.round(records.filter((r) => r.status === 'active').reduce((sum, r) => sum + r.deferredAmount, 0) * 100) / 100,
      totalRecognized: Math.round(records.reduce((sum, r) => sum + r.recognizedAmount, 0) * 100) / 100,
      byStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        count: data.count,
        amount: Math.round(data.amount * 100) / 100,
      })),
      byCustomer: Array.from(customerMap.entries())
        .map(([customerId, data]) => ({
          customerId,
          customerName: data.customerName,
          deferredAmount: Math.round(data.deferredAmount * 100) / 100,
        }))
        .sort((a, b) => b.deferredAmount - a.deferredAmount)
        .slice(0, 10),
      upcomingRecognition: Array.from(upcomingMap.entries())
        .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.period.localeCompare(b.period)),
      agingAnalysis: {
        current: Math.round(aging.current * 100) / 100,
        oneToThreeMonths: Math.round(aging.oneToThreeMonths * 100) / 100,
        threeToSixMonths: Math.round(aging.threeToSixMonths * 100) / 100,
        sixToTwelveMonths: Math.round(aging.sixToTwelveMonths * 100) / 100,
        overTwelveMonths: Math.round(aging.overTwelveMonths * 100) / 100,
      },
    };
  }

  /**
   * Get deferred revenue records
   */
  async getDeferredRevenueRecords(
    userId: string,
    filters?: {
      status?: 'active' | 'fully_recognized' | 'cancelled';
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<DeferredRevenueRecord[]> {
    let records = Array.from(this.deferredRevenue.values()).filter(
      (r) => r.userId === userId,
    );

    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    if (filters?.customerId) {
      records = records.filter((r) => r.customerId === filters.customerId);
    }

    if (filters?.startDate) {
      records = records.filter((r) => r.serviceStartDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      records = records.filter((r) => r.serviceEndDate <= filters.endDate!);
    }

    records = records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      records = records.slice(0, filters.limit);
    }

    return records;
  }

  private generateRevenueSchedule(
    startDate: Date,
    endDate: Date,
    totalAmount: number,
    method: 'straight_line' | 'milestone' | 'percentage_completion' | 'point_in_time',
  ): RevenueScheduleEntry[] {
    const schedule: RevenueScheduleEntry[] = [];

    if (method === 'point_in_time') {
      // Recognize all at once on end date
      schedule.push({
        date: endDate,
        amount: totalAmount,
        percentage: 100,
        recognized: false,
      });
    } else {
      // Straight-line recognition over the period
      const months = this.calculateMonthsBetween(startDate, endDate);
      const monthlyAmount = months > 0 ? totalAmount / months : totalAmount;

      let current = new Date(startDate);
      let accumulated = 0;

      while (current <= endDate && accumulated < totalAmount) {
        const amount = Math.min(monthlyAmount, totalAmount - accumulated);
        accumulated += amount;

        schedule.push({
          date: new Date(current),
          amount: Math.round(amount * 100) / 100,
          percentage: Math.round((accumulated / totalAmount) * 10000) / 100,
          recognized: false,
        });

        current.setMonth(current.getMonth() + 1);
      }
    }

    return schedule;
  }

  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1
    );
  }
}

// =================== REVENUE RECOGNITION INTERFACES ===================

export interface DeferredRevenueRecord {
  id: string;
  userId: string;
  invoiceId: string;
  contractId?: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
  currency: string;
  serviceStartDate: Date;
  serviceEndDate: Date;
  recognitionMethod: 'straight_line' | 'milestone' | 'percentage_completion' | 'point_in_time';
  monthlyAmount: number;
  description: string;
  accountCode: string;
  schedule: RevenueScheduleEntry[];
  status: 'active' | 'fully_recognized' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface RevenueScheduleEntry {
  date: Date;
  amount: number;
  percentage: number;
  recognized: boolean;
  recognizedAt?: Date;
}

interface RevenueSchedule {
  id: string;
  name: string;
  contractId: string;
  customerId: string;
  entries: RevenueScheduleEntry[];
}

interface RevenueRecognitionRule {
  id: string;
  name: string;
  productType: string;
  recognitionTiming: 'at_delivery' | 'over_time' | 'on_completion' | 'on_milestone';
  measurementMethod: 'output' | 'input' | 'time_based';
  description: string;
}
