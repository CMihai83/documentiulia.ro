import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Multi-Currency Service
 * Handles currency conversion, exchange rates, and multi-currency support
 *
 * Features:
 * - Real-time exchange rates from ECB (European Central Bank)
 * - Fallback to Open Exchange Rates API
 * - In-memory caching with configurable TTL
 * - Historical exchange rates
 * - Currency formatting by locale
 * - Supported currencies: EUR, RON, USD, GBP, CHF, PLN, CZK, HUF, BGN, SEK, DKK, NOK
 */

// =================== TYPES & INTERFACES ===================

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  country?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: 'ECB' | 'OPEN_EXCHANGE_RATES' | 'MANUAL' | 'CACHED';
}

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  rateTimestamp: Date;
  source: string;
}

export interface CurrencyFormatOptions {
  locale?: string;
  showSymbol?: boolean;
  showCode?: boolean;
  decimals?: number;
}

export interface HistoricalRate {
  date: Date;
  from: string;
  to: string;
  rate: number;
}

// =================== CURRENCY DEFINITIONS ===================

export const SUPPORTED_CURRENCIES: Record<string, Currency> = {
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, country: 'EU' },
  RON: { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimals: 2, country: 'RO' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, country: 'US' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, country: 'GB' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, country: 'CH' },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2, country: 'PL' },
  CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, country: 'CZ' },
  HUF: { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, country: 'HU' },
  BGN: { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, country: 'BG' },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, country: 'SE' },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, country: 'DK' },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, country: 'NO' },
  HRK: { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', decimals: 2, country: 'HR' },
  RSD: { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', decimals: 2, country: 'RS' },
  UAH: { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, country: 'UA' },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2, country: 'TR' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, country: 'JP' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, country: 'CN' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, country: 'CA' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, country: 'AU' },
};

// Default fallback rates (EUR base) - updated periodically
const FALLBACK_RATES: Record<string, number> = {
  EUR: 1.0,
  RON: 4.97,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.94,
  PLN: 4.32,
  CZK: 25.2,
  HUF: 395.0,
  BGN: 1.96,
  SEK: 11.5,
  DKK: 7.46,
  NOK: 11.8,
  HRK: 7.53,
  RSD: 117.0,
  UAH: 44.5,
  TRY: 35.2,
  JPY: 162.0,
  CNY: 7.85,
  CAD: 1.48,
  AUD: 1.67,
};

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);

  // Cache for exchange rates (EUR-based)
  private ratesCache: Map<string, { rate: number; timestamp: Date }> = new Map();
  private cacheTimestamp: Date | null = null;
  private readonly cacheTTL: number; // milliseconds

  // ECB API endpoint (free, no API key required)
  private readonly ECB_API = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
  private readonly OPEN_EXCHANGE_API = 'https://open.er-api.com/v6/latest/EUR';

  constructor(private readonly config: ConfigService) {
    // Cache TTL: default 1 hour (3600000ms)
    this.cacheTTL = this.config.get<number>('CURRENCY_CACHE_TTL') || 3600000;
  }

  async onModuleInit() {
    // Pre-load exchange rates on startup
    try {
      await this.refreshExchangeRates();
      this.logger.log('Exchange rates loaded successfully');
    } catch (error) {
      this.logger.warn('Failed to load exchange rates on startup, using fallback rates');
      this.loadFallbackRates();
    }
  }

  // =================== EXCHANGE RATE FETCHING ===================

  /**
   * Refresh exchange rates from external API
   */
  async refreshExchangeRates(): Promise<void> {
    try {
      // Try ECB first
      await this.fetchECBRates();
      this.logger.log('Exchange rates updated from ECB');
    } catch (ecbError) {
      this.logger.warn('ECB fetch failed, trying Open Exchange Rates API');
      try {
        await this.fetchOpenExchangeRates();
        this.logger.log('Exchange rates updated from Open Exchange Rates');
      } catch (openError) {
        this.logger.error('All exchange rate sources failed, using fallback');
        this.loadFallbackRates();
      }
    }
  }

  /**
   * Fetch rates from European Central Bank
   */
  private async fetchECBRates(): Promise<void> {
    const response = await fetch(this.ECB_API);
    if (!response.ok) {
      throw new Error(`ECB API error: ${response.status}`);
    }

    const xml = await response.text();
    const rates = this.parseECBXml(xml);

    const now = new Date();
    this.ratesCache.set('EUR', { rate: 1.0, timestamp: now });

    for (const [currency, rate] of Object.entries(rates)) {
      this.ratesCache.set(currency, { rate, timestamp: now });
    }

    this.cacheTimestamp = now;
  }

  /**
   * Parse ECB XML response
   */
  private parseECBXml(xml: string): Record<string, number> {
    const rates: Record<string, number> = {};

    // Simple regex-based XML parsing
    const cubeRegex = /<Cube currency='([A-Z]+)' rate='([0-9.]+)'\/>/g;
    let match;

    while ((match = cubeRegex.exec(xml)) !== null) {
      const currency = match[1];
      const rate = parseFloat(match[2]);
      if (!isNaN(rate)) {
        rates[currency] = rate;
      }
    }

    return rates;
  }

  /**
   * Fetch rates from Open Exchange Rates API (free tier)
   */
  private async fetchOpenExchangeRates(): Promise<void> {
    const response = await fetch(this.OPEN_EXCHANGE_API);
    if (!response.ok) {
      throw new Error(`Open Exchange Rates API error: ${response.status}`);
    }

    const data = await response.json();
    const now = new Date();

    this.ratesCache.set('EUR', { rate: 1.0, timestamp: now });

    if (data.rates) {
      for (const [currency, rate] of Object.entries(data.rates)) {
        if (typeof rate === 'number') {
          this.ratesCache.set(currency, { rate, timestamp: now });
        }
      }
    }

    this.cacheTimestamp = now;
  }

  /**
   * Load fallback rates when APIs are unavailable
   */
  private loadFallbackRates(): void {
    const now = new Date();

    for (const [currency, rate] of Object.entries(FALLBACK_RATES)) {
      this.ratesCache.set(currency, { rate, timestamp: now });
    }

    this.cacheTimestamp = now;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) return false;
    const age = Date.now() - this.cacheTimestamp.getTime();
    return age < this.cacheTTL;
  }

  // =================== EXCHANGE RATE RETRIEVAL ===================

  /**
   * Get current exchange rate between two currencies
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    // Refresh cache if expired
    if (!this.isCacheValid()) {
      await this.refreshExchangeRates();
    }

    from = from.toUpperCase();
    to = to.toUpperCase();

    // Same currency
    if (from === to) {
      return {
        from,
        to,
        rate: 1.0,
        timestamp: new Date(),
        source: 'CACHED',
      };
    }

    const fromRate = this.ratesCache.get(from);
    const toRate = this.ratesCache.get(to);

    if (!fromRate) {
      throw new Error(`Unsupported currency: ${from}`);
    }
    if (!toRate) {
      throw new Error(`Unsupported currency: ${to}`);
    }

    // Calculate cross rate via EUR
    // If EUR/USD = 1.08 and EUR/RON = 4.97
    // Then USD/RON = 4.97 / 1.08 = 4.60
    const rate = toRate.rate / fromRate.rate;

    return {
      from,
      to,
      rate: Math.round(rate * 1000000) / 1000000, // 6 decimal precision
      timestamp: fromRate.timestamp,
      source: 'CACHED',
    };
  }

  /**
   * Get all current exchange rates (EUR-based)
   */
  async getAllRates(): Promise<Record<string, ExchangeRate>> {
    if (!this.isCacheValid()) {
      await this.refreshExchangeRates();
    }

    const rates: Record<string, ExchangeRate> = {};

    for (const [currency, data] of this.ratesCache.entries()) {
      rates[currency] = {
        from: 'EUR',
        to: currency,
        rate: data.rate,
        timestamp: data.timestamp,
        source: 'CACHED',
      };
    }

    return rates;
  }

  /**
   * Get rates for a specific base currency
   */
  async getRatesForBase(baseCurrency: string): Promise<Record<string, number>> {
    if (!this.isCacheValid()) {
      await this.refreshExchangeRates();
    }

    baseCurrency = baseCurrency.toUpperCase();
    const baseRate = this.ratesCache.get(baseCurrency);

    if (!baseRate) {
      throw new Error(`Unsupported base currency: ${baseCurrency}`);
    }

    const rates: Record<string, number> = {};

    for (const [currency, data] of this.ratesCache.entries()) {
      rates[currency] = Math.round((data.rate / baseRate.rate) * 1000000) / 1000000;
    }

    return rates;
  }

  // =================== CURRENCY CONVERSION ===================

  /**
   * Convert amount between currencies
   */
  async convert(
    amount: number,
    from: string,
    to: string,
  ): Promise<ConversionResult> {
    const exchangeRate = await this.getExchangeRate(from, to);
    const convertedAmount = amount * exchangeRate.rate;

    // Get decimal places for target currency
    const toCurrency = SUPPORTED_CURRENCIES[to.toUpperCase()];
    const decimals = toCurrency?.decimals ?? 2;

    return {
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * Math.pow(10, decimals)) / Math.pow(10, decimals),
      rate: exchangeRate.rate,
      rateTimestamp: exchangeRate.timestamp,
      source: exchangeRate.source,
    };
  }

  /**
   * Convert amount to multiple currencies at once
   */
  async convertToMultiple(
    amount: number,
    from: string,
    toCurrencies: string[],
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const to of toCurrencies) {
      const result = await this.convert(amount, from, to);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate equivalent amounts across all supported currencies
   */
  async getEquivalentAmounts(
    amount: number,
    baseCurrency: string,
  ): Promise<Record<string, number>> {
    const rates = await this.getRatesForBase(baseCurrency);
    const equivalents: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(rates)) {
      const currencyDef = SUPPORTED_CURRENCIES[currency];
      const decimals = currencyDef?.decimals ?? 2;
      equivalents[currency] = Math.round(amount * rate * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    return equivalents;
  }

  // =================== CURRENCY FORMATTING ===================

  /**
   * Format amount with currency symbol and locale
   */
  formatCurrency(
    amount: number,
    currencyCode: string,
    options: CurrencyFormatOptions = {},
  ): string {
    const {
      locale = 'en-US',
      showSymbol = true,
      showCode = false,
      decimals,
    } = options;

    currencyCode = currencyCode.toUpperCase();
    const currency = SUPPORTED_CURRENCIES[currencyCode];

    if (!currency) {
      // Fallback to basic formatting
      return `${amount.toFixed(2)} ${currencyCode}`;
    }

    const decimalPlaces = decimals ?? currency.decimals;

    try {
      if (showSymbol) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(amount);
      }

      const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(amount);

      return showCode ? `${formattedNumber} ${currencyCode}` : formattedNumber;
    } catch {
      // Fallback for unsupported locales
      return `${currency.symbol}${amount.toFixed(decimalPlaces)}`;
    }
  }

  /**
   * Format amount for Romanian locale (commonly used)
   */
  formatRON(amount: number): string {
    return this.formatCurrency(amount, 'RON', { locale: 'ro-RO' });
  }

  /**
   * Format amount for European locale
   */
  formatEUR(amount: number): string {
    return this.formatCurrency(amount, 'EUR', { locale: 'de-DE' });
  }

  // =================== CURRENCY INFO ===================

  /**
   * Get currency information
   */
  getCurrency(code: string): Currency | null {
    return SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(code: string): boolean {
    return code.toUpperCase() in SUPPORTED_CURRENCIES;
  }

  /**
   * Get currencies for a specific country
   */
  getCurrencyByCountry(countryCode: string): Currency | null {
    const currency = Object.values(SUPPORTED_CURRENCIES).find(
      (c) => c.country === countryCode.toUpperCase(),
    );
    return currency || null;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Round amount to currency's decimal places
   */
  roundToCurrency(amount: number, currencyCode: string): number {
    const currency = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()];
    const decimals = currency?.decimals ?? 2;
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Get the cache status for monitoring
   */
  getCacheStatus(): {
    isValid: boolean;
    lastUpdate: Date | null;
    ratesCount: number;
    ttlMs: number;
  } {
    return {
      isValid: this.isCacheValid(),
      lastUpdate: this.cacheTimestamp,
      ratesCount: this.ratesCache.size,
      ttlMs: this.cacheTTL,
    };
  }

  /**
   * Force refresh exchange rates (for admin use)
   */
  async forceRefresh(): Promise<{ success: boolean; source: string; ratesCount: number }> {
    this.cacheTimestamp = null; // Invalidate cache
    await this.refreshExchangeRates();

    return {
      success: this.isCacheValid(),
      source: 'ECB/OpenExchangeRates',
      ratesCount: this.ratesCache.size,
    };
  }

  /**
   * Calculate invoice total in multiple currencies
   */
  async calculateMultiCurrencyTotal(
    items: Array<{ amount: number; currency: string }>,
    targetCurrency: string,
  ): Promise<{
    total: number;
    currency: string;
    breakdown: Array<{
      originalAmount: number;
      originalCurrency: string;
      convertedAmount: number;
      rate: number;
    }>;
  }> {
    let total = 0;
    const breakdown: Array<{
      originalAmount: number;
      originalCurrency: string;
      convertedAmount: number;
      rate: number;
    }> = [];

    for (const item of items) {
      const conversion = await this.convert(item.amount, item.currency, targetCurrency);
      total += conversion.convertedAmount;

      breakdown.push({
        originalAmount: item.amount,
        originalCurrency: item.currency,
        convertedAmount: conversion.convertedAmount,
        rate: conversion.rate,
      });
    }

    return {
      total: this.roundToCurrency(total, targetCurrency),
      currency: targetCurrency,
      breakdown,
    };
  }

  /**
   * Get exchange rate history (mock for now - would need historical API)
   */
  async getHistoricalRates(
    from: string,
    to: string,
    days: number = 30,
  ): Promise<HistoricalRate[]> {
    const currentRate = await this.getExchangeRate(from, to);
    const history: HistoricalRate[] = [];

    // Generate mock historical data with slight variations
    // In production, this would fetch from a historical rates API
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add some realistic variation (±2%)
      const variation = 1 + (Math.random() - 0.5) * 0.04;
      const historicalRate = currentRate.rate * variation;

      history.push({
        date,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: Math.round(historicalRate * 1000000) / 1000000,
      });
    }

    return history;
  }
}
