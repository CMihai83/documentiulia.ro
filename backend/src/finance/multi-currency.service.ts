import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// Currency Types
export type CurrencyCode =
  | 'EUR' | 'USD' | 'GBP' | 'RON' | 'PLN' | 'CZK' | 'HUF' | 'BGN'
  | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'JPY' | 'CNY' | 'AUD' | 'CAD'
  | 'TRY' | 'RUB' | 'INR' | 'BRL' | 'MXN' | 'ZAR' | 'SGD' | 'HKD'
  | 'KRW' | 'NZD' | 'AED' | 'SAR' | 'ILS' | 'THB';

export type RateSource = 'ecb' | 'bnr' | 'manual' | 'api' | 'cached';

export type ConversionDirection = 'buy' | 'sell' | 'mid';

// Currency Information
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  country: string;
  region: 'EU' | 'Americas' | 'Asia' | 'EMEA' | 'Oceania';
  isBaseCurrency: boolean;
  isEUMember: boolean;
  isMajor: boolean;
}

// Exchange Rate
export interface ExchangeRate {
  id: string;
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  inverseRate: number;
  buyRate: number;
  sellRate: number;
  spread: number;
  source: RateSource;
  fetchedAt: Date;
  validUntil: Date;
  change24h?: number;
  changePercent24h?: number;
}

// Rate History Entry
export interface RateHistoryEntry {
  date: Date;
  rate: number;
  high: number;
  low: number;
  open: number;
  close: number;
  source: RateSource;
}

// Conversion Result
export interface ConversionResult {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fromAmount: number;
  toAmount: number;
  rate: number;
  direction: ConversionDirection;
  fees: {
    percentage: number;
    fixed: number;
    total: number;
  };
  netAmount: number;
  rateSource: RateSource;
  convertedAt: Date;
  validUntil: Date;
}

// Multi-Currency Price
export interface MultiCurrencyPrice {
  id: string;
  productId?: string;
  baseCurrency: CurrencyCode;
  baseAmount: number;
  prices: {
    currency: CurrencyCode;
    amount: number;
    rate: number;
    updatedAt: Date;
  }[];
  autoUpdate: boolean;
  marginPercent: number;
  roundingRule: 'none' | 'up' | 'down' | 'nearest' | 'psychological';
  createdAt: Date;
  updatedAt: Date;
}

// Currency Account
export interface CurrencyAccount {
  id: string;
  tenantId: string;
  currency: CurrencyCode;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  reservedBalance: number;
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Currency Transaction
export interface CurrencyTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'transfer' | 'fee' | 'refund';
  currency: CurrencyCode;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  conversionId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Hedging Position
export interface HedgingPosition {
  id: string;
  tenantId: string;
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  amount: number;
  strikeRate: number;
  currentRate: number;
  type: 'forward' | 'option' | 'spot';
  direction: 'buy' | 'sell';
  expiresAt: Date;
  status: 'active' | 'exercised' | 'expired' | 'cancelled';
  pnl: number;
  createdAt: Date;
}

// Currency Analytics
export interface CurrencyAnalytics {
  tenantId: string;
  period: { start: Date; end: Date };
  summary: {
    totalConversions: number;
    totalVolume: Record<CurrencyCode, number>;
    totalFees: number;
    averageSpread: number;
  };
  byPair: {
    pair: string;
    conversions: number;
    volume: number;
    averageRate: number;
    fees: number;
  }[];
  exposure: {
    currency: CurrencyCode;
    balance: number;
    valueInBaseCurrency: number;
    percentOfTotal: number;
  }[];
  rateMovements: {
    pair: string;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

// BNR Rate Response interface
export interface BNRRateData {
  currency: string;
  rate: number;
  multiplier: number;
  date: string;
}

@Injectable()
export class MultiCurrencyService implements OnModuleInit {
  private readonly logger = new Logger(MultiCurrencyService.name);

  // BNR API URL (National Bank of Romania)
  private readonly BNR_API_URL = 'https://www.bnr.ro/nbrfxrates.xml';

  // In-memory stores
  private currencies: Map<CurrencyCode, CurrencyInfo> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private rateHistory: Map<string, RateHistoryEntry[]> = new Map();
  private conversions: Map<string, ConversionResult> = new Map();
  private multiCurrencyPrices: Map<string, MultiCurrencyPrice> = new Map();
  private currencyAccounts: Map<string, CurrencyAccount> = new Map();
  private transactions: Map<string, CurrencyTransaction> = new Map();
  private hedgingPositions: Map<string, HedgingPosition> = new Map();

  // BNR rates cache
  private bnrRates: Map<string, BNRRateData> = new Map();
  private lastBNRUpdate: Date | null = null;

  // Default base currency
  private defaultBaseCurrency: CurrencyCode = 'EUR';

  constructor() {
    this.initializeCurrencies();
    this.initializeExchangeRates();
  }

  async onModuleInit() {
    // Fetch BNR rates on startup
    await this.fetchBNRRates();
  }

  // ==================== BNR Integration ====================

  /**
   * Fetch exchange rates from BNR (National Bank of Romania)
   * BNR publishes rates daily at 13:00 EET
   */
  @Cron(CronExpression.EVERY_DAY_AT_1PM)
  async fetchBNRRates(): Promise<void> {
    try {
      this.logger.log('Fetching exchange rates from BNR...');

      const response = await fetch(this.BNR_API_URL);
      if (!response.ok) {
        throw new Error(`BNR API returned ${response.status}`);
      }

      const xmlText = await response.text();
      const rates = this.parseBNRXml(xmlText);

      // Update exchange rates with BNR data (RON-based)
      const now = new Date();
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const rate of rates) {
        const currency = rate.currency as CurrencyCode;
        if (!this.currencies.has(currency)) continue;

        // BNR rates are RON per unit of foreign currency
        // e.g., EUR = 4.9750 means 1 EUR = 4.9750 RON
        const ronRate = rate.rate / rate.multiplier;

        // Store RON to Currency rate
        const ronToCurrencyId = `rate_RON_${currency}`;
        const spread = this.calculateSpread(currency);

        this.exchangeRates.set(ronToCurrencyId, {
          id: ronToCurrencyId,
          baseCurrency: 'RON',
          targetCurrency: currency,
          rate: 1 / ronRate,
          inverseRate: ronRate,
          buyRate: (1 / ronRate) * (1 - spread / 2),
          sellRate: (1 / ronRate) * (1 + spread / 2),
          spread,
          source: 'bnr',
          fetchedAt: now,
          validUntil,
        });

        // Store Currency to RON rate
        const currencyToRonId = `rate_${currency}_RON`;
        this.exchangeRates.set(currencyToRonId, {
          id: currencyToRonId,
          baseCurrency: currency,
          targetCurrency: 'RON',
          rate: ronRate,
          inverseRate: 1 / ronRate,
          buyRate: ronRate * (1 - spread / 2),
          sellRate: ronRate * (1 + spread / 2),
          spread,
          source: 'bnr',
          fetchedAt: now,
          validUntil,
        });

        // Store BNR rate data
        this.bnrRates.set(currency, rate);

        // Store in history
        const historyKey = `RON_${currency}`;
        const history = this.rateHistory.get(historyKey) || [];
        history.push({
          date: now,
          rate: 1 / ronRate,
          high: 1 / ronRate,
          low: 1 / ronRate,
          open: 1 / ronRate,
          close: 1 / ronRate,
          source: 'bnr',
        });
        this.rateHistory.set(historyKey, history.slice(-365));
      }

      this.lastBNRUpdate = now;
      this.logger.log(`Updated ${rates.length} exchange rates from BNR`);
    } catch (error) {
      this.logger.error(`Failed to fetch BNR rates: ${error.message}`);
      // Rates will continue to use cached/fallback values
    }
  }

  /**
   * Parse BNR XML response
   */
  private parseBNRXml(xmlText: string): BNRRateData[] {
    const rates: BNRRateData[] = [];

    try {
      // Extract date
      const dateMatch = xmlText.match(/<Cube date="(\d{4}-\d{2}-\d{2})">/);
      const rateDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

      // Extract rates using regex (simple parsing without XML library)
      const rateRegex = /<Rate currency="([A-Z]{3})"(?:\s+multiplier="(\d+)")?>([\d.]+)<\/Rate>/g;
      let match;

      while ((match = rateRegex.exec(xmlText)) !== null) {
        rates.push({
          currency: match[1],
          multiplier: match[2] ? parseInt(match[2], 10) : 1,
          rate: parseFloat(match[3]),
          date: rateDate,
        });
      }
    } catch (error) {
      this.logger.error(`Error parsing BNR XML: ${error.message}`);
    }

    return rates;
  }

  /**
   * Get BNR rate for a currency
   */
  getBNRRate(currency: CurrencyCode): BNRRateData | undefined {
    return this.bnrRates.get(currency);
  }

  /**
   * Get all BNR rates
   */
  getAllBNRRates(): { rates: BNRRateData[]; lastUpdate: Date | null } {
    return {
      rates: Array.from(this.bnrRates.values()),
      lastUpdate: this.lastBNRUpdate,
    };
  }

  /**
   * Get exchange rate with BNR as source for Romanian compliance
   */
  getOfficialRONRate(currency: CurrencyCode): ExchangeRate | undefined {
    const rate = this.exchangeRates.get(`rate_${currency}_RON`);
    if (rate && rate.source === 'bnr') {
      return rate;
    }
    return undefined;
  }

  /**
   * Convert amount to RON using official BNR rate (required for ANAF compliance)
   */
  convertToRONOfficial(amount: number, fromCurrency: CurrencyCode): {
    ronAmount: number;
    rate: number;
    source: string;
    rateDate: string;
  } | null {
    if (fromCurrency === 'RON') {
      return {
        ronAmount: amount,
        rate: 1,
        source: 'direct',
        rateDate: new Date().toISOString().split('T')[0],
      };
    }

    const bnrRate = this.bnrRates.get(fromCurrency);
    if (!bnrRate) {
      return null;
    }

    const ronAmount = amount * (bnrRate.rate / bnrRate.multiplier);

    return {
      ronAmount: this.roundAmount(ronAmount, 'RON'),
      rate: bnrRate.rate / bnrRate.multiplier,
      source: 'BNR',
      rateDate: bnrRate.date,
    };
  }

  /**
   * Convert RON to foreign currency using official BNR rate
   */
  convertFromRONOfficial(ronAmount: number, toCurrency: CurrencyCode): {
    amount: number;
    rate: number;
    source: string;
    rateDate: string;
  } | null {
    if (toCurrency === 'RON') {
      return {
        amount: ronAmount,
        rate: 1,
        source: 'direct',
        rateDate: new Date().toISOString().split('T')[0],
      };
    }

    const bnrRate = this.bnrRates.get(toCurrency);
    if (!bnrRate) {
      return null;
    }

    const foreignAmount = ronAmount / (bnrRate.rate / bnrRate.multiplier);

    return {
      amount: this.roundAmount(foreignAmount, toCurrency),
      rate: bnrRate.rate / bnrRate.multiplier,
      source: 'BNR',
      rateDate: bnrRate.date,
    };
  }

  /**
   * Get rate for invoice conversion per Romanian fiscal regulations
   * Uses BNR rate from the invoice date or closest previous business day
   */
  async getRateForInvoice(
    currency: CurrencyCode,
    invoiceDate: Date,
  ): Promise<{
    rate: number;
    rateDate: string;
    source: string;
    isOfficial: boolean;
  }> {
    // For simplicity, use current BNR rate
    // In production, would fetch historical rate from BNR archive
    const bnrRate = this.bnrRates.get(currency);

    if (bnrRate) {
      return {
        rate: bnrRate.rate / bnrRate.multiplier,
        rateDate: bnrRate.date,
        source: 'BNR',
        isOfficial: true,
      };
    }

    // Fallback to ECB rate
    const eurRate = this.exchangeRates.get(`rate_EUR_${currency}`);
    const ronRate = this.exchangeRates.get('rate_EUR_RON');

    if (eurRate && ronRate) {
      return {
        rate: ronRate.rate / eurRate.rate,
        rateDate: new Date().toISOString().split('T')[0],
        source: 'ECB_CALCULATED',
        isOfficial: false,
      };
    }

    throw new BadRequestException(`No exchange rate available for ${currency}`);
  }

  private initializeCurrencies(): void {
    const currencyList: CurrencyInfo[] = [
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, country: 'European Union', region: 'EU', isBaseCurrency: true, isEUMember: true, isMajor: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, country: 'United States', region: 'Americas', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, country: 'United Kingdom', region: 'EU', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimals: 2, country: 'Romania', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2, country: 'Poland', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, country: 'Czech Republic', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, country: 'Hungary', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, country: 'Bulgaria', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, country: 'Switzerland', region: 'EU', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, country: 'Sweden', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, country: 'Norway', region: 'EU', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, country: 'Denmark', region: 'EU', isBaseCurrency: false, isEUMember: true, isMajor: false },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, country: 'Japan', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, country: 'China', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, country: 'Australia', region: 'Oceania', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, country: 'Canada', region: 'Americas', isBaseCurrency: false, isEUMember: false, isMajor: true },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2, country: 'Turkey', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimals: 2, country: 'Russia', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, country: 'India', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, country: 'Brazil', region: 'Americas', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2, country: 'Mexico', region: 'Americas', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, country: 'South Africa', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, country: 'Singapore', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, country: 'Hong Kong', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0, country: 'South Korea', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, country: 'New Zealand', region: 'Oceania', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, country: 'UAE', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2, country: 'Saudi Arabia', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimals: 2, country: 'Israel', region: 'EMEA', isBaseCurrency: false, isEUMember: false, isMajor: false },
      { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2, country: 'Thailand', region: 'Asia', isBaseCurrency: false, isEUMember: false, isMajor: false },
    ];

    currencyList.forEach(c => this.currencies.set(c.code, c));
    this.logger.log(`Initialized ${this.currencies.size} currencies`);
  }

  private initializeExchangeRates(): void {
    // Initialize with realistic EUR-based rates (December 2025 estimates)
    const eurRates: Record<string, number> = {
      'USD': 1.0850,
      'GBP': 0.8550,
      'RON': 4.9750,
      'PLN': 4.3200,
      'CZK': 25.1500,
      'HUF': 395.50,
      'BGN': 1.9558, // Fixed to EUR
      'CHF': 0.9450,
      'SEK': 11.2500,
      'NOK': 11.5800,
      'DKK': 7.4600, // Near-fixed to EUR
      'JPY': 162.50,
      'CNY': 7.8500,
      'AUD': 1.6550,
      'CAD': 1.4750,
      'TRY': 32.50,
      'RUB': 98.50,
      'INR': 90.50,
      'BRL': 5.3500,
      'MXN': 18.75,
      'ZAR': 19.85,
      'SGD': 1.4550,
      'HKD': 8.4500,
      'KRW': 1425.00,
      'NZD': 1.7850,
      'AED': 3.9850,
      'SAR': 4.0700,
      'ILS': 3.9250,
      'THB': 37.85,
    };

    const now = new Date();
    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // EUR to other currencies
    for (const [currency, rate] of Object.entries(eurRates)) {
      const spread = this.calculateSpread(currency as CurrencyCode);
      const rateId = `rate_EUR_${currency}`;

      this.exchangeRates.set(rateId, {
        id: rateId,
        baseCurrency: 'EUR',
        targetCurrency: currency as CurrencyCode,
        rate,
        inverseRate: 1 / rate,
        buyRate: rate * (1 - spread / 2),
        sellRate: rate * (1 + spread / 2),
        spread,
        source: 'ecb',
        fetchedAt: now,
        validUntil,
        change24h: (Math.random() - 0.5) * 0.02 * rate,
        changePercent24h: (Math.random() - 0.5) * 2,
      });

      // Also store inverse
      const inverseId = `rate_${currency}_EUR`;
      const inverseRate = 1 / rate;
      this.exchangeRates.set(inverseId, {
        id: inverseId,
        baseCurrency: currency as CurrencyCode,
        targetCurrency: 'EUR',
        rate: inverseRate,
        inverseRate: rate,
        buyRate: inverseRate * (1 - spread / 2),
        sellRate: inverseRate * (1 + spread / 2),
        spread,
        source: 'ecb',
        fetchedAt: now,
        validUntil,
      });
    }

    // EUR to EUR (1:1)
    this.exchangeRates.set('rate_EUR_EUR', {
      id: 'rate_EUR_EUR',
      baseCurrency: 'EUR',
      targetCurrency: 'EUR',
      rate: 1,
      inverseRate: 1,
      buyRate: 1,
      sellRate: 1,
      spread: 0,
      source: 'manual',
      fetchedAt: now,
      validUntil,
    });

    this.logger.log(`Initialized ${this.exchangeRates.size} exchange rates`);
  }

  private calculateSpread(currency: CurrencyCode): number {
    // Major currencies have lower spreads
    const majorCurrencies: CurrencyCode[] = ['USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'CNY'];
    const euCurrencies: CurrencyCode[] = ['RON', 'PLN', 'CZK', 'HUF', 'BGN', 'SEK', 'DKK'];

    if (majorCurrencies.includes(currency)) {
      return 0.005; // 0.5%
    } else if (euCurrencies.includes(currency)) {
      return 0.01; // 1%
    } else {
      return 0.02; // 2%
    }
  }

  // ==================== Currency Information ====================

  getCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values());
  }

  getCurrency(code: CurrencyCode): CurrencyInfo | undefined {
    return this.currencies.get(code);
  }

  getMajorCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values()).filter(c => c.isMajor);
  }

  getEUCurrencies(): CurrencyInfo[] {
    return Array.from(this.currencies.values()).filter(c => c.isEUMember || c.code === 'EUR');
  }

  getCurrenciesByRegion(region: CurrencyInfo['region']): CurrencyInfo[] {
    return Array.from(this.currencies.values()).filter(c => c.region === region);
  }

  // ==================== Exchange Rates ====================

  getExchangeRate(baseCurrency: CurrencyCode, targetCurrency: CurrencyCode): ExchangeRate | undefined {
    // Direct rate
    const directKey = `rate_${baseCurrency}_${targetCurrency}`;
    if (this.exchangeRates.has(directKey)) {
      return this.exchangeRates.get(directKey);
    }

    // Try via EUR
    if (baseCurrency !== 'EUR' && targetCurrency !== 'EUR') {
      const baseToEur = this.exchangeRates.get(`rate_${baseCurrency}_EUR`);
      const eurToTarget = this.exchangeRates.get(`rate_EUR_${targetCurrency}`);

      if (baseToEur && eurToTarget) {
        const crossRate = baseToEur.rate * eurToTarget.rate;
        const spread = Math.max(baseToEur.spread, eurToTarget.spread);
        const now = new Date();

        return {
          id: `rate_${baseCurrency}_${targetCurrency}_cross`,
          baseCurrency,
          targetCurrency,
          rate: crossRate,
          inverseRate: 1 / crossRate,
          buyRate: crossRate * (1 - spread / 2),
          sellRate: crossRate * (1 + spread / 2),
          spread,
          source: 'cached',
          fetchedAt: now,
          validUntil: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour for cross rates
        };
      }
    }

    return undefined;
  }

  getAllExchangeRates(baseCurrency: CurrencyCode = 'EUR'): ExchangeRate[] {
    const rates: ExchangeRate[] = [];

    for (const currency of this.currencies.keys()) {
      if (currency !== baseCurrency) {
        const rate = this.getExchangeRate(baseCurrency, currency);
        if (rate) {
          rates.push(rate);
        }
      }
    }

    return rates.sort((a, b) => a.targetCurrency.localeCompare(b.targetCurrency));
  }

  async updateExchangeRate(
    baseCurrency: CurrencyCode,
    targetCurrency: CurrencyCode,
    rate: number,
    source: RateSource = 'manual',
  ): Promise<ExchangeRate> {
    const key = `rate_${baseCurrency}_${targetCurrency}`;
    const spread = this.calculateSpread(targetCurrency);
    const now = new Date();

    const oldRate = this.exchangeRates.get(key);
    const change24h = oldRate ? rate - oldRate.rate : undefined;
    const changePercent24h = oldRate ? ((rate - oldRate.rate) / oldRate.rate) * 100 : undefined;

    const exchangeRate: ExchangeRate = {
      id: key,
      baseCurrency,
      targetCurrency,
      rate,
      inverseRate: 1 / rate,
      buyRate: rate * (1 - spread / 2),
      sellRate: rate * (1 + spread / 2),
      spread,
      source,
      fetchedAt: now,
      validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      change24h,
      changePercent24h,
    };

    this.exchangeRates.set(key, exchangeRate);

    // Store in history
    const historyKey = `${baseCurrency}_${targetCurrency}`;
    const history = this.rateHistory.get(historyKey) || [];
    history.push({
      date: now,
      rate,
      high: rate,
      low: rate,
      open: oldRate?.rate || rate,
      close: rate,
      source,
    });
    this.rateHistory.set(historyKey, history.slice(-365)); // Keep 1 year

    // Update inverse rate
    const inverseKey = `rate_${targetCurrency}_${baseCurrency}`;
    this.exchangeRates.set(inverseKey, {
      ...exchangeRate,
      id: inverseKey,
      baseCurrency: targetCurrency,
      targetCurrency: baseCurrency,
      rate: 1 / rate,
      inverseRate: rate,
      buyRate: (1 / rate) * (1 - spread / 2),
      sellRate: (1 / rate) * (1 + spread / 2),
    });

    this.logger.log(`Updated exchange rate ${baseCurrency}/${targetCurrency}: ${rate}`);

    return exchangeRate;
  }

  getRateHistory(
    baseCurrency: CurrencyCode,
    targetCurrency: CurrencyCode,
    days: number = 30,
  ): RateHistoryEntry[] {
    const key = `${baseCurrency}_${targetCurrency}`;
    const history = this.rateHistory.get(key) || [];
    return history.slice(-days);
  }

  // ==================== Currency Conversion ====================

  async convert(params: {
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    amount: number;
    direction?: ConversionDirection;
    tenantId?: string;
  }): Promise<ConversionResult> {
    const { fromCurrency, toCurrency, amount, direction = 'mid', tenantId } = params;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    if (!rate) {
      throw new BadRequestException(`No exchange rate available for ${fromCurrency}/${toCurrency}`);
    }

    let effectiveRate: number;
    switch (direction) {
      case 'buy':
        effectiveRate = rate.buyRate;
        break;
      case 'sell':
        effectiveRate = rate.sellRate;
        break;
      default:
        effectiveRate = rate.rate;
    }

    const toAmount = amount * effectiveRate;

    // Calculate fees (0.1% conversion fee + fixed based on amount)
    const percentageFee = amount * 0.001;
    const fixedFee = amount > 10000 ? 5 : amount > 1000 ? 2 : 0.5;
    const totalFee = percentageFee + fixedFee;

    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const result: ConversionResult = {
      id: conversionId,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: this.roundAmount(toAmount, toCurrency),
      rate: effectiveRate,
      direction,
      fees: {
        percentage: this.roundAmount(percentageFee, fromCurrency),
        fixed: fixedFee,
        total: this.roundAmount(totalFee, fromCurrency),
      },
      netAmount: this.roundAmount(toAmount - (totalFee * effectiveRate), toCurrency),
      rateSource: rate.source,
      convertedAt: now,
      validUntil: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
    };

    this.conversions.set(conversionId, result);

    // Update accounts if tenantId provided
    if (tenantId) {
      await this.processConversionTransaction(tenantId, result);
    }

    this.logger.log(`Converted ${amount} ${fromCurrency} to ${result.toAmount} ${toCurrency}`);

    return result;
  }

  private async processConversionTransaction(tenantId: string, conversion: ConversionResult): Promise<void> {
    // Get or create accounts
    const fromAccount = await this.getOrCreateAccount(tenantId, conversion.fromCurrency);
    const toAccount = await this.getOrCreateAccount(tenantId, conversion.toCurrency);

    // Check balance
    if (fromAccount.availableBalance < conversion.fromAmount + conversion.fees.total) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct from source account
    const fromTransaction: CurrencyTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      accountId: fromAccount.id,
      type: 'conversion',
      currency: conversion.fromCurrency,
      amount: -(conversion.fromAmount + conversion.fees.total),
      balanceBefore: fromAccount.balance,
      balanceAfter: fromAccount.balance - conversion.fromAmount - conversion.fees.total,
      reference: `Conversion to ${conversion.toCurrency}`,
      conversionId: conversion.id,
      metadata: { rate: conversion.rate, direction: conversion.direction },
      createdAt: new Date(),
    };

    fromAccount.balance = fromTransaction.balanceAfter;
    fromAccount.availableBalance = fromTransaction.balanceAfter;
    fromAccount.lastTransactionAt = new Date();
    fromAccount.updatedAt = new Date();
    this.currencyAccounts.set(fromAccount.id, fromAccount);
    this.transactions.set(fromTransaction.id, fromTransaction);

    // Credit to target account
    const toTransaction: CurrencyTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      accountId: toAccount.id,
      type: 'conversion',
      currency: conversion.toCurrency,
      amount: conversion.netAmount,
      balanceBefore: toAccount.balance,
      balanceAfter: toAccount.balance + conversion.netAmount,
      reference: `Conversion from ${conversion.fromCurrency}`,
      conversionId: conversion.id,
      metadata: { rate: conversion.rate, direction: conversion.direction },
      createdAt: new Date(),
    };

    toAccount.balance = toTransaction.balanceAfter;
    toAccount.availableBalance = toTransaction.balanceAfter;
    toAccount.lastTransactionAt = new Date();
    toAccount.updatedAt = new Date();
    this.currencyAccounts.set(toAccount.id, toAccount);
    this.transactions.set(toTransaction.id, toTransaction);
  }

  getConversion(conversionId: string): ConversionResult | undefined {
    return this.conversions.get(conversionId);
  }

  getConversionQuote(
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    amount: number,
    direction: ConversionDirection = 'mid',
  ): ConversionResult | null {
    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    if (!rate) return null;

    let effectiveRate: number;
    switch (direction) {
      case 'buy':
        effectiveRate = rate.buyRate;
        break;
      case 'sell':
        effectiveRate = rate.sellRate;
        break;
      default:
        effectiveRate = rate.rate;
    }

    const toAmount = amount * effectiveRate;
    const percentageFee = amount * 0.001;
    const fixedFee = amount > 10000 ? 5 : amount > 1000 ? 2 : 0.5;
    const totalFee = percentageFee + fixedFee;

    return {
      id: 'quote',
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: this.roundAmount(toAmount, toCurrency),
      rate: effectiveRate,
      direction,
      fees: {
        percentage: this.roundAmount(percentageFee, fromCurrency),
        fixed: fixedFee,
        total: this.roundAmount(totalFee, fromCurrency),
      },
      netAmount: this.roundAmount(toAmount - (totalFee * effectiveRate), toCurrency),
      rateSource: rate.source,
      convertedAt: new Date(),
      validUntil: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  // ==================== Multi-Currency Pricing ====================

  async createMultiCurrencyPrice(params: {
    productId?: string;
    baseCurrency: CurrencyCode;
    baseAmount: number;
    currencies: CurrencyCode[];
    autoUpdate?: boolean;
    marginPercent?: number;
    roundingRule?: MultiCurrencyPrice['roundingRule'];
  }): Promise<MultiCurrencyPrice> {
    const id = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const prices: MultiCurrencyPrice['prices'] = [];

    for (const currency of params.currencies) {
      if (currency === params.baseCurrency) {
        prices.push({
          currency,
          amount: params.baseAmount,
          rate: 1,
          updatedAt: now,
        });
      } else {
        const rate = this.getExchangeRate(params.baseCurrency, currency);
        if (rate) {
          let amount = params.baseAmount * rate.rate;

          // Apply margin
          if (params.marginPercent) {
            amount *= (1 + params.marginPercent / 100);
          }

          // Apply rounding
          amount = this.applyRounding(amount, currency, params.roundingRule || 'nearest');

          prices.push({
            currency,
            amount,
            rate: rate.rate,
            updatedAt: now,
          });
        }
      }
    }

    const multiCurrencyPrice: MultiCurrencyPrice = {
      id,
      productId: params.productId,
      baseCurrency: params.baseCurrency,
      baseAmount: params.baseAmount,
      prices,
      autoUpdate: params.autoUpdate ?? true,
      marginPercent: params.marginPercent ?? 0,
      roundingRule: params.roundingRule ?? 'nearest',
      createdAt: now,
      updatedAt: now,
    };

    this.multiCurrencyPrices.set(id, multiCurrencyPrice);
    this.logger.log(`Created multi-currency price ${id} for ${params.currencies.length} currencies`);

    return multiCurrencyPrice;
  }

  getMultiCurrencyPrice(priceId: string): MultiCurrencyPrice | undefined {
    return this.multiCurrencyPrices.get(priceId);
  }

  getMultiCurrencyPriceByProduct(productId: string): MultiCurrencyPrice | undefined {
    return Array.from(this.multiCurrencyPrices.values())
      .find(p => p.productId === productId);
  }

  async updateMultiCurrencyPrices(priceId: string): Promise<MultiCurrencyPrice> {
    const price = this.multiCurrencyPrices.get(priceId);
    if (!price) {
      throw new BadRequestException('Multi-currency price not found');
    }

    const now = new Date();

    for (const priceEntry of price.prices) {
      if (priceEntry.currency !== price.baseCurrency) {
        const rate = this.getExchangeRate(price.baseCurrency, priceEntry.currency);
        if (rate) {
          let amount = price.baseAmount * rate.rate;

          if (price.marginPercent) {
            amount *= (1 + price.marginPercent / 100);
          }

          amount = this.applyRounding(amount, priceEntry.currency, price.roundingRule);

          priceEntry.amount = amount;
          priceEntry.rate = rate.rate;
          priceEntry.updatedAt = now;
        }
      }
    }

    price.updatedAt = now;
    this.multiCurrencyPrices.set(priceId, price);

    return price;
  }

  getPriceInCurrency(priceId: string, currency: CurrencyCode): number | null {
    const price = this.multiCurrencyPrices.get(priceId);
    if (!price) return null;

    const priceEntry = price.prices.find(p => p.currency === currency);
    if (priceEntry) return priceEntry.amount;

    // Try to calculate on the fly
    const rate = this.getExchangeRate(price.baseCurrency, currency);
    if (rate) {
      let amount = price.baseAmount * rate.rate;
      if (price.marginPercent) {
        amount *= (1 + price.marginPercent / 100);
      }
      return this.applyRounding(amount, currency, price.roundingRule);
    }

    return null;
  }

  private applyRounding(
    amount: number,
    currency: CurrencyCode,
    rule: MultiCurrencyPrice['roundingRule'],
  ): number {
    const currencyInfo = this.currencies.get(currency);
    const decimals = currencyInfo?.decimals ?? 2;

    switch (rule) {
      case 'up':
        return Math.ceil(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
      case 'down':
        return Math.floor(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
      case 'nearest':
        return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
      case 'psychological':
        // Round to .99 or .95
        const base = Math.floor(amount);
        return base + 0.99;
      default:
        return amount;
    }
  }

  private roundAmount(amount: number, currency: CurrencyCode): number {
    const currencyInfo = this.currencies.get(currency);
    const decimals = currencyInfo?.decimals ?? 2;
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // ==================== Currency Accounts ====================

  async createCurrencyAccount(tenantId: string, currency: CurrencyCode): Promise<CurrencyAccount> {
    const id = `cacc_${tenantId}_${currency}`;

    if (this.currencyAccounts.has(id)) {
      throw new BadRequestException('Currency account already exists');
    }

    const account: CurrencyAccount = {
      id,
      tenantId,
      currency,
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      reservedBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.currencyAccounts.set(id, account);
    this.logger.log(`Created currency account ${id}`);

    return account;
  }

  async getOrCreateAccount(tenantId: string, currency: CurrencyCode): Promise<CurrencyAccount> {
    const id = `cacc_${tenantId}_${currency}`;
    const existing = this.currencyAccounts.get(id);
    if (existing) return existing;
    return this.createCurrencyAccount(tenantId, currency);
  }

  getCurrencyAccount(accountId: string): CurrencyAccount | undefined {
    return this.currencyAccounts.get(accountId);
  }

  getCurrencyAccountsByTenant(tenantId: string): CurrencyAccount[] {
    return Array.from(this.currencyAccounts.values())
      .filter(a => a.tenantId === tenantId);
  }

  async deposit(
    tenantId: string,
    currency: CurrencyCode,
    amount: number,
    reference?: string,
  ): Promise<CurrencyTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const account = await this.getOrCreateAccount(tenantId, currency);

    const transaction: CurrencyTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      accountId: account.id,
      type: 'deposit',
      currency,
      amount,
      balanceBefore: account.balance,
      balanceAfter: account.balance + amount,
      reference,
      metadata: {},
      createdAt: new Date(),
    };

    account.balance = transaction.balanceAfter;
    account.availableBalance = transaction.balanceAfter;
    account.lastTransactionAt = new Date();
    account.updatedAt = new Date();

    this.currencyAccounts.set(account.id, account);
    this.transactions.set(transaction.id, transaction);

    this.logger.log(`Deposited ${amount} ${currency} to account ${account.id}`);

    return transaction;
  }

  async withdraw(
    tenantId: string,
    currency: CurrencyCode,
    amount: number,
    reference?: string,
  ): Promise<CurrencyTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const account = await this.getOrCreateAccount(tenantId, currency);

    if (account.availableBalance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const transaction: CurrencyTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      accountId: account.id,
      type: 'withdrawal',
      currency,
      amount: -amount,
      balanceBefore: account.balance,
      balanceAfter: account.balance - amount,
      reference,
      metadata: {},
      createdAt: new Date(),
    };

    account.balance = transaction.balanceAfter;
    account.availableBalance = transaction.balanceAfter;
    account.lastTransactionAt = new Date();
    account.updatedAt = new Date();

    this.currencyAccounts.set(account.id, account);
    this.transactions.set(transaction.id, transaction);

    this.logger.log(`Withdrew ${amount} ${currency} from account ${account.id}`);

    return transaction;
  }

  getTransactions(tenantId: string, filters?: {
    currency?: CurrencyCode;
    type?: CurrencyTransaction['type'];
    startDate?: Date;
    endDate?: Date;
  }): CurrencyTransaction[] {
    let transactions = Array.from(this.transactions.values())
      .filter(t => t.tenantId === tenantId);

    if (filters) {
      if (filters.currency) {
        transactions = transactions.filter(t => t.currency === filters.currency);
      }
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      if (filters.startDate) {
        transactions = transactions.filter(t => t.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => t.createdAt <= filters.endDate!);
      }
    }

    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ==================== Hedging ====================

  async createHedgingPosition(params: {
    tenantId: string;
    baseCurrency: CurrencyCode;
    targetCurrency: CurrencyCode;
    amount: number;
    strikeRate: number;
    type: HedgingPosition['type'];
    direction: HedgingPosition['direction'];
    expiresAt: Date;
  }): Promise<HedgingPosition> {
    const currentRate = this.getExchangeRate(params.baseCurrency, params.targetCurrency);
    if (!currentRate) {
      throw new BadRequestException('No exchange rate available');
    }

    const id = `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const position: HedgingPosition = {
      id,
      tenantId: params.tenantId,
      baseCurrency: params.baseCurrency,
      targetCurrency: params.targetCurrency,
      amount: params.amount,
      strikeRate: params.strikeRate,
      currentRate: currentRate.rate,
      type: params.type,
      direction: params.direction,
      expiresAt: params.expiresAt,
      status: 'active',
      pnl: 0,
      createdAt: new Date(),
    };

    this.hedgingPositions.set(id, position);
    this.logger.log(`Created hedging position ${id}`);

    return position;
  }

  getHedgingPosition(positionId: string): HedgingPosition | undefined {
    return this.hedgingPositions.get(positionId);
  }

  getHedgingPositionsByTenant(tenantId: string, status?: HedgingPosition['status']): HedgingPosition[] {
    let positions = Array.from(this.hedgingPositions.values())
      .filter(p => p.tenantId === tenantId);

    if (status) {
      positions = positions.filter(p => p.status === status);
    }

    return positions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateHedgingPositionPnL(positionId: string): Promise<HedgingPosition> {
    const position = this.hedgingPositions.get(positionId);
    if (!position) {
      throw new BadRequestException('Hedging position not found');
    }

    const currentRate = this.getExchangeRate(position.baseCurrency, position.targetCurrency);
    if (currentRate) {
      position.currentRate = currentRate.rate;

      // Calculate P&L
      const rateDiff = position.direction === 'buy'
        ? currentRate.rate - position.strikeRate
        : position.strikeRate - currentRate.rate;

      position.pnl = position.amount * rateDiff;
    }

    this.hedgingPositions.set(positionId, position);

    return position;
  }

  // ==================== Analytics ====================

  getCurrencyAnalytics(tenantId: string, startDate: Date, endDate: Date): CurrencyAnalytics {
    const transactions = this.getTransactions(tenantId, { startDate, endDate });
    const accounts = this.getCurrencyAccountsByTenant(tenantId);
    const conversions = Array.from(this.conversions.values())
      .filter(c => c.convertedAt >= startDate && c.convertedAt <= endDate);

    // Total volume by currency
    const totalVolume: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
    for (const txn of transactions) {
      totalVolume[txn.currency] = (totalVolume[txn.currency] || 0) + Math.abs(txn.amount);
    }

    // By pair
    const byPairMap = new Map<string, { conversions: number; volume: number; rates: number[]; fees: number }>();
    for (const conv of conversions) {
      const pair = `${conv.fromCurrency}/${conv.toCurrency}`;
      const existing = byPairMap.get(pair) || { conversions: 0, volume: 0, rates: [], fees: 0 };
      existing.conversions++;
      existing.volume += conv.fromAmount;
      existing.rates.push(conv.rate);
      existing.fees += conv.fees.total;
      byPairMap.set(pair, existing);
    }

    const byPair = Array.from(byPairMap.entries()).map(([pair, data]) => ({
      pair,
      conversions: data.conversions,
      volume: data.volume,
      averageRate: data.rates.reduce((a, b) => a + b, 0) / data.rates.length,
      fees: data.fees,
    }));

    // Exposure
    let totalValueInBase = 0;
    const exposure: CurrencyAnalytics['exposure'] = [];

    for (const account of accounts) {
      const rate = this.getExchangeRate(account.currency, this.defaultBaseCurrency);
      const valueInBase = rate ? account.balance * rate.rate : account.balance;
      totalValueInBase += valueInBase;

      exposure.push({
        currency: account.currency,
        balance: account.balance,
        valueInBaseCurrency: valueInBase,
        percentOfTotal: 0, // Calculate after total is known
      });
    }

    for (const exp of exposure) {
      exp.percentOfTotal = totalValueInBase > 0 ? (exp.valueInBaseCurrency / totalValueInBase) * 100 : 0;
    }

    // Rate movements
    const rateMovements: CurrencyAnalytics['rateMovements'] = [];
    for (const [key, rate] of this.exchangeRates) {
      if (rate.baseCurrency === 'EUR' && rate.change24h !== undefined) {
        rateMovements.push({
          pair: `${rate.baseCurrency}/${rate.targetCurrency}`,
          change: rate.change24h,
          changePercent: rate.changePercent24h || 0,
          trend: (rate.changePercent24h || 0) > 0.1 ? 'up' : (rate.changePercent24h || 0) < -0.1 ? 'down' : 'stable',
        });
      }
    }

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      summary: {
        totalConversions: conversions.length,
        totalVolume,
        totalFees: conversions.reduce((sum, c) => sum + c.fees.total, 0),
        averageSpread: conversions.length > 0
          ? conversions.reduce((sum, c) => {
              const rate = this.getExchangeRate(c.fromCurrency, c.toCurrency);
              return sum + (rate?.spread || 0);
            }, 0) / conversions.length
          : 0,
      },
      byPair,
      exposure: exposure.sort((a, b) => b.valueInBaseCurrency - a.valueInBaseCurrency),
      rateMovements: rateMovements.slice(0, 10),
    };
  }

  // ==================== Utility Methods ====================

  formatAmount(amount: number, currency: CurrencyCode): string {
    const currencyInfo = this.currencies.get(currency);
    if (!currencyInfo) {
      return `${amount.toFixed(2)} ${currency}`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    }).format(amount);
  }

  parseAmount(formattedAmount: string, currency: CurrencyCode): number {
    const currencyInfo = this.currencies.get(currency);
    const cleaned = formattedAmount.replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleaned);
    return this.roundAmount(amount, currency);
  }

  isValidCurrency(code: string): code is CurrencyCode {
    return this.currencies.has(code as CurrencyCode);
  }

  getDefaultBaseCurrency(): CurrencyCode {
    return this.defaultBaseCurrency;
  }

  setDefaultBaseCurrency(currency: CurrencyCode): void {
    if (!this.currencies.has(currency)) {
      throw new BadRequestException('Invalid currency');
    }
    this.defaultBaseCurrency = currency;
    this.logger.log(`Default base currency set to ${currency}`);
  }
}
