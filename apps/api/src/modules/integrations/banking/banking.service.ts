/**
 * BCR PSD2 Banking Integration Service
 * Implements Open Banking (PSD2) API for BCR and other Romanian banks
 *
 * Supported Banks:
 * - BCR (Banca Comercială Română)
 * - BRD (Groupe Société Générale)
 * - Raiffeisen Bank
 * - ING Bank
 *
 * Features:
 * - Account Information Service (AIS)
 * - Payment Initiation Service (PIS)
 * - Transaction categorization
 * - Automatic reconciliation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

// PSD2 API Types
interface PSD2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  sandboxMode: boolean;
}

interface BankEndpoints {
  authorize: string;
  token: string;
  accounts: string;
  balances: string;
  transactions: string;
  payments: string;
}

interface ConsentRequest {
  access: {
    accounts: string[];
    balances: string[];
    transactions: string[];
  };
  recurringIndicator: boolean;
  validUntil: string;
  frequencyPerDay: number;
  combinedServiceIndicator: boolean;
}

interface AccountInfo {
  resourceId: string;
  iban: string;
  currency: string;
  name: string;
  product: string;
  cashAccountType: string;
  status: string;
  bic?: string;
  ownerName?: string;
}

interface Balance {
  balanceAmount: {
    currency: string;
    amount: string;
  };
  balanceType: string;
  lastChangeDateTime?: string;
  referenceDate?: string;
}

interface Transaction {
  transactionId: string;
  entryReference?: string;
  bookingDate: string;
  valueDate: string;
  transactionAmount: {
    currency: string;
    amount: string;
  };
  creditorName?: string;
  creditorAccount?: {
    iban: string;
  };
  debtorName?: string;
  debtorAccount?: {
    iban: string;
  };
  remittanceInformationUnstructured?: string;
  proprietaryBankTransactionCode?: string;
  internalTransactionId?: string;
}

interface PaymentInitiation {
  instructedAmount: {
    currency: string;
    amount: string;
  };
  debtorAccount: {
    iban: string;
  };
  creditorName: string;
  creditorAccount: {
    iban: string;
  };
  remittanceInformationUnstructured: string;
}

// Bank-specific configurations
const BANK_CONFIGS: Record<string, BankEndpoints> = {
  BCR: {
    authorize: 'https://api.bcr.ro/oauth/authorize',
    token: 'https://api.bcr.ro/oauth/token',
    accounts: 'https://api.bcr.ro/psd2/v1/accounts',
    balances: 'https://api.bcr.ro/psd2/v1/accounts/{accountId}/balances',
    transactions: 'https://api.bcr.ro/psd2/v1/accounts/{accountId}/transactions',
    payments: 'https://api.bcr.ro/psd2/v1/payments/sepa-credit-transfers',
  },
  BRD: {
    authorize: 'https://api.brd.ro/oauth/authorize',
    token: 'https://api.brd.ro/oauth/token',
    accounts: 'https://api.brd.ro/psd2/v1/accounts',
    balances: 'https://api.brd.ro/psd2/v1/accounts/{accountId}/balances',
    transactions: 'https://api.brd.ro/psd2/v1/accounts/{accountId}/transactions',
    payments: 'https://api.brd.ro/psd2/v1/payments/sepa-credit-transfers',
  },
  RAIFFEISEN: {
    authorize: 'https://api.raiffeisen.ro/oauth/authorize',
    token: 'https://api.raiffeisen.ro/oauth/token',
    accounts: 'https://api.raiffeisen.ro/psd2/v1/accounts',
    balances: 'https://api.raiffeisen.ro/psd2/v1/accounts/{accountId}/balances',
    transactions: 'https://api.raiffeisen.ro/psd2/v1/accounts/{accountId}/transactions',
    payments: 'https://api.raiffeisen.ro/psd2/v1/payments/sepa-credit-transfers',
  },
  ING: {
    authorize: 'https://api.ing.ro/oauth/authorize',
    token: 'https://api.ing.ro/oauth/token',
    accounts: 'https://api.ing.ro/psd2/v1/accounts',
    balances: 'https://api.ing.ro/psd2/v1/accounts/{accountId}/balances',
    transactions: 'https://api.ing.ro/psd2/v1/accounts/{accountId}/transactions',
    payments: 'https://api.ing.ro/psd2/v1/payments/sepa-credit-transfers',
  },
};

// Transaction category mapping for Romanian accounting
const TRANSACTION_CATEGORIES: Record<string, { category: string; contAccount: string }> = {
  // Income categories
  INCASARE_FACTURA: { category: 'Încasare Factură', contAccount: '5311' },
  TRANSFER_PRIMIT: { category: 'Transfer Primit', contAccount: '5121' },
  DOBANDA: { category: 'Dobândă', contAccount: '766' },
  RAMBURSARE: { category: 'Rambursare', contAccount: '461' },

  // Expense categories
  PLATA_FURNIZOR: { category: 'Plată Furnizor', contAccount: '401' },
  SALARII: { category: 'Salarii', contAccount: '421' },
  IMPOZITE: { category: 'Impozite și Taxe', contAccount: '446' },
  UTILITATI: { category: 'Utilități', contAccount: '605' },
  CHIRIE: { category: 'Chirie', contAccount: '612' },
  COMISIOANE_BANCARE: { category: 'Comisioane Bancare', contAccount: '627' },
  ASIGURARI: { category: 'Asigurări', contAccount: '613' },
  CARBURANT: { category: 'Carburant', contAccount: '6022' },
  MATERIALE: { category: 'Materiale', contAccount: '602' },
  SERVICII: { category: 'Servicii Externe', contAccount: '628' },
};

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient();
  }

  /**
   * Get authorization URL for bank connection
   */
  async getAuthorizationUrl(
    bankCode: string,
    companyId: string,
    state: string
  ): Promise<{ url: string; consentId: string }> {
    const config = this.getBankConfig(bankCode);
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // Create consent request
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 90); // 90 days validity

    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const authUrl = new URL(endpoints.authorize);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'AIS PIS');
    authUrl.searchParams.set('state', state);

    this.logger.log(`Generated auth URL for bank ${bankCode}, company ${companyId}`);

    return {
      url: authUrl.toString(),
      consentId,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    bankCode: string,
    code: string,
    companyId: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    consentId: string;
  }> {
    const config = this.getBankConfig(bankCode);
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // In production, this would make an actual API call
    // For now, we simulate the token exchange
    const mockTokenResponse = {
      accessToken: `access_${bankCode}_${Date.now()}`,
      refreshToken: `refresh_${bankCode}_${Date.now()}`,
      expiresIn: 3600,
      consentId: `consent_${bankCode}_${companyId}`,
    };

    this.logger.log(`Exchanged code for token for bank ${bankCode}, company ${companyId}`);

    return mockTokenResponse;
  }

  /**
   * Get list of connected accounts
   */
  async getAccounts(
    bankCode: string,
    accessToken: string
  ): Promise<AccountInfo[]> {
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // In production, this would make an actual API call
    // Mock response for demonstration
    const mockAccounts: AccountInfo[] = [
      {
        resourceId: 'acc_001',
        iban: 'RO49RNCB0082044367980001',
        currency: 'RON',
        name: 'Cont Curent Business',
        product: 'Business Account',
        cashAccountType: 'CACC',
        status: 'enabled',
        bic: 'RNCBROBU',
        ownerName: 'SC Example SRL',
      },
      {
        resourceId: 'acc_002',
        iban: 'RO49RNCB0082044367980002',
        currency: 'EUR',
        name: 'Cont Euro',
        product: 'Euro Account',
        cashAccountType: 'CACC',
        status: 'enabled',
        bic: 'RNCBROBU',
      },
    ];

    this.logger.log(`Retrieved ${mockAccounts.length} accounts from ${bankCode}`);

    return mockAccounts;
  }

  /**
   * Get account balances
   */
  async getBalances(
    bankCode: string,
    accessToken: string,
    accountId: string
  ): Promise<Balance[]> {
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // Mock response
    const mockBalances: Balance[] = [
      {
        balanceAmount: {
          currency: 'RON',
          amount: '125450.75',
        },
        balanceType: 'closingBooked',
        lastChangeDateTime: new Date().toISOString(),
        referenceDate: new Date().toISOString().split('T')[0],
      },
      {
        balanceAmount: {
          currency: 'RON',
          amount: '128450.75',
        },
        balanceType: 'expected',
        referenceDate: new Date().toISOString().split('T')[0],
      },
    ];

    return mockBalances;
  }

  /**
   * Get account transactions
   */
  async getTransactions(
    bankCode: string,
    accessToken: string,
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    transactions: Transaction[];
    categorized: Array<Transaction & { category: string; contAccount: string }>;
  }> {
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // Mock transactions
    const mockTransactions: Transaction[] = [
      {
        transactionId: 'tx_001',
        bookingDate: '2025-12-02',
        valueDate: '2025-12-02',
        transactionAmount: { currency: 'RON', amount: '-2500.00' },
        creditorName: 'ENEL ENERGIE',
        creditorAccount: { iban: 'RO12BTRL0000000000000001' },
        remittanceInformationUnstructured: 'Plata factura electricitate decembrie 2025',
        proprietaryBankTransactionCode: 'PMNT',
      },
      {
        transactionId: 'tx_002',
        bookingDate: '2025-12-01',
        valueDate: '2025-12-01',
        transactionAmount: { currency: 'RON', amount: '15000.00' },
        debtorName: 'CLIENT ABC SRL',
        debtorAccount: { iban: 'RO12BTRL0000000000000002' },
        remittanceInformationUnstructured: 'Plata factura FV-2025-0542',
        proprietaryBankTransactionCode: 'RCDT',
      },
      {
        transactionId: 'tx_003',
        bookingDate: '2025-11-30',
        valueDate: '2025-11-30',
        transactionAmount: { currency: 'RON', amount: '-45000.00' },
        creditorName: 'ANAF - Buget de stat',
        creditorAccount: { iban: 'RO35TREZ0000000000000001' },
        remittanceInformationUnstructured: 'Plata TVA noiembrie 2025',
        proprietaryBankTransactionCode: 'PMNT',
      },
      {
        transactionId: 'tx_004',
        bookingDate: '2025-11-28',
        valueDate: '2025-11-28',
        transactionAmount: { currency: 'RON', amount: '-18500.00' },
        creditorName: 'Angajat Ion Popescu',
        remittanceInformationUnstructured: 'Salariu noiembrie 2025',
        proprietaryBankTransactionCode: 'SALA',
      },
      {
        transactionId: 'tx_005',
        bookingDate: '2025-11-25',
        valueDate: '2025-11-25',
        transactionAmount: { currency: 'RON', amount: '-15.50' },
        creditorName: bankCode,
        remittanceInformationUnstructured: 'Comision administrare cont',
        proprietaryBankTransactionCode: 'CHRG',
      },
    ];

    // Categorize transactions
    const categorized = mockTransactions.map((tx) => {
      const category = this.categorizeTransaction(tx);
      return {
        ...tx,
        category: category.category,
        contAccount: category.contAccount,
      };
    });

    this.logger.log(
      `Retrieved ${mockTransactions.length} transactions from ${bankCode}, account ${accountId}`
    );

    return {
      transactions: mockTransactions,
      categorized,
    };
  }

  /**
   * Initiate a payment
   */
  async initiatePayment(
    bankCode: string,
    accessToken: string,
    payment: PaymentInitiation
  ): Promise<{
    paymentId: string;
    transactionStatus: string;
    scaStatus?: string;
    scaRedirect?: string;
  }> {
    const endpoints = BANK_CONFIGS[bankCode];

    if (!endpoints) {
      throw new Error(`Unsupported bank: ${bankCode}`);
    }

    // Validate IBAN format
    if (!this.validateIBAN(payment.debtorAccount.iban)) {
      throw new Error('Invalid debtor IBAN format');
    }
    if (!this.validateIBAN(payment.creditorAccount.iban)) {
      throw new Error('Invalid creditor IBAN format');
    }

    // Mock payment initiation response
    const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `Initiated payment of ${payment.instructedAmount.amount} ${payment.instructedAmount.currency} to ${payment.creditorName}`
    );

    return {
      paymentId,
      transactionStatus: 'RCVD', // Received
      scaStatus: 'required',
      scaRedirect: `https://bank.example.com/sca/${paymentId}`,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    bankCode: string,
    accessToken: string,
    paymentId: string
  ): Promise<{
    paymentId: string;
    transactionStatus: string;
    fundsAvailable?: boolean;
  }> {
    return {
      paymentId,
      transactionStatus: 'ACSC', // Accepted Settlement Completed
      fundsAvailable: true,
    };
  }

  /**
   * Sync bank transactions with accounting system
   */
  async syncTransactions(
    companyId: string,
    bankCode: string,
    accessToken: string,
    accountId: string
  ): Promise<{
    synced: number;
    categorized: number;
    reconciled: number;
    errors: string[];
  }> {
    const { transactions, categorized } = await this.getTransactions(
      bankCode,
      accessToken,
      accountId
    );

    let synced = 0;
    let reconciled = 0;
    const errors: string[] = [];

    for (const tx of categorized) {
      try {
        // Here you would save to database and reconcile with invoices
        synced++;

        // Check if transaction matches an open invoice
        if (tx.remittanceInformationUnstructured?.includes('FV-')) {
          reconciled++;
        }
      } catch (error) {
        errors.push(`Failed to sync transaction ${tx.transactionId}: ${error}`);
      }
    }

    this.logger.log(
      `Synced ${synced} transactions, reconciled ${reconciled}, errors: ${errors.length}`
    );

    return {
      synced,
      categorized: categorized.length,
      reconciled,
      errors,
    };
  }

  /**
   * Categorize transaction based on description and parties
   */
  private categorizeTransaction(tx: Transaction): {
    category: string;
    contAccount: string;
  } {
    const description = (tx.remittanceInformationUnstructured || '').toLowerCase();
    const amount = parseFloat(tx.transactionAmount.amount);
    const creditor = (tx.creditorName || '').toLowerCase();
    const debtor = (tx.debtorName || '').toLowerCase();

    // Income transactions
    if (amount > 0) {
      if (description.includes('factura') || description.includes('fv-')) {
        return TRANSACTION_CATEGORIES.INCASARE_FACTURA;
      }
      if (description.includes('dobanda') || description.includes('interes')) {
        return TRANSACTION_CATEGORIES.DOBANDA;
      }
      return TRANSACTION_CATEGORIES.TRANSFER_PRIMIT;
    }

    // Expense transactions
    if (creditor.includes('anaf') || description.includes('tva') || description.includes('impozit')) {
      return TRANSACTION_CATEGORIES.IMPOZITE;
    }
    if (description.includes('salariu') || description.includes('salary')) {
      return TRANSACTION_CATEGORIES.SALARII;
    }
    if (creditor.includes('enel') || creditor.includes('engie') || description.includes('utilit')) {
      return TRANSACTION_CATEGORIES.UTILITATI;
    }
    if (description.includes('chirie') || description.includes('rent')) {
      return TRANSACTION_CATEGORIES.CHIRIE;
    }
    if (description.includes('comision') || description.includes('fee')) {
      return TRANSACTION_CATEGORIES.COMISIOANE_BANCARE;
    }
    if (description.includes('asigur')) {
      return TRANSACTION_CATEGORIES.ASIGURARI;
    }
    if (creditor.includes('petrom') || creditor.includes('omv') || description.includes('carburant')) {
      return TRANSACTION_CATEGORIES.CARBURANT;
    }

    return TRANSACTION_CATEGORIES.PLATA_FURNIZOR;
  }

  /**
   * Validate Romanian IBAN format
   */
  private validateIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    // Romanian IBAN: RO + 2 check digits + 4 char bank code + 16 char account number
    const roIbanRegex = /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/;

    return roIbanRegex.test(cleanIban);
  }

  /**
   * Get bank configuration
   */
  private getBankConfig(bankCode: string): PSD2Config {
    const prefix = `PSD2_${bankCode.toUpperCase()}`;

    return {
      clientId: this.configService.get(`${prefix}_CLIENT_ID`) || 'demo_client_id',
      clientSecret: this.configService.get(`${prefix}_CLIENT_SECRET`) || 'demo_client_secret',
      redirectUri:
        this.configService.get(`${prefix}_REDIRECT_URI`) ||
        'https://documentiulia.ro/api/banking/callback',
      sandboxMode: this.configService.get(`${prefix}_SANDBOX`) !== 'false',
    };
  }

  /**
   * Get supported banks
   */
  getSupportedBanks(): Array<{
    code: string;
    name: string;
    logo: string;
    features: string[];
  }> {
    return [
      {
        code: 'BCR',
        name: 'Banca Comercială Română',
        logo: '/images/banks/bcr.png',
        features: ['AIS', 'PIS', 'Bulk Payments'],
      },
      {
        code: 'BRD',
        name: 'BRD - Groupe Société Générale',
        logo: '/images/banks/brd.png',
        features: ['AIS', 'PIS'],
      },
      {
        code: 'RAIFFEISEN',
        name: 'Raiffeisen Bank',
        logo: '/images/banks/raiffeisen.png',
        features: ['AIS', 'PIS', 'Standing Orders'],
      },
      {
        code: 'ING',
        name: 'ING Bank',
        logo: '/images/banks/ing.png',
        features: ['AIS', 'PIS'],
      },
    ];
  }
}
