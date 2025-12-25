import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

export interface ExchangeRate {
  currency: string;
  name: string;
  rate: number;
  multiplier: number;
  date: Date;
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  date: Date;
}

export interface HistoricalRate {
  currency: string;
  date: Date;
  rate: number;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private rates: Map<string, ExchangeRate> = new Map();
  private historicalRates: Map<string, HistoricalRate[]> = new Map();
  private lastUpdate: Date | null = null;

  // Common currencies with their Romanian names
  private readonly currencyNames: Record<string, string> = {
    EUR: 'Euro',
    USD: 'Dolar american',
    GBP: 'Lira sterlină',
    CHF: 'Franc elvețian',
    PLN: 'Zlot polonez',
    HUF: 'Forint maghiar',
    CZK: 'Coroană cehă',
    BGN: 'Leva bulgărească',
    SEK: 'Coroană suedeză',
    NOK: 'Coroană norvegiană',
    DKK: 'Coroană daneză',
    CAD: 'Dolar canadian',
    AUD: 'Dolar australian',
    JPY: 'Yen japonez',
    CNY: 'Yuan chinezesc',
    TRY: 'Liră turcească',
    RSD: 'Dinar sârbesc',
    MDL: 'Leu moldovenesc',
    UAH: 'Hryvnia ucraineană',
    RON: 'Leu românesc',
  };

  constructor(private configService: ConfigService) {
    this.initializeDefaultRates();
    this.fetchBNRRates();
  }

  /**
   * Initialize with default rates (fallback)
   */
  private initializeDefaultRates(): void {
    const defaultRates: Array<{ currency: string; rate: number; multiplier: number }> = [
      { currency: 'EUR', rate: 4.9750, multiplier: 1 },
      { currency: 'USD', rate: 4.7200, multiplier: 1 },
      { currency: 'GBP', rate: 5.9500, multiplier: 1 },
      { currency: 'CHF', rate: 5.3100, multiplier: 1 },
      { currency: 'PLN', rate: 1.1580, multiplier: 1 },
      { currency: 'HUF', rate: 1.2350, multiplier: 100 },
      { currency: 'CZK', rate: 0.1980, multiplier: 1 },
      { currency: 'BGN', rate: 2.5440, multiplier: 1 },
      { currency: 'SEK', rate: 0.4320, multiplier: 1 },
      { currency: 'NOK', rate: 0.4280, multiplier: 1 },
      { currency: 'DKK', rate: 0.6670, multiplier: 1 },
      { currency: 'CAD', rate: 3.4500, multiplier: 1 },
      { currency: 'AUD', rate: 3.0200, multiplier: 1 },
      { currency: 'JPY', rate: 3.0800, multiplier: 100 },
      { currency: 'CNY', rate: 0.6480, multiplier: 1 },
      { currency: 'TRY', rate: 0.1340, multiplier: 1 },
      { currency: 'RON', rate: 1.0000, multiplier: 1 },
    ];

    const now = new Date();
    defaultRates.forEach(({ currency, rate, multiplier }) => {
      this.rates.set(currency, {
        currency,
        name: this.currencyNames[currency] || currency,
        rate,
        multiplier,
        date: now,
      });
    });

    this.logger.log('Initialized default exchange rates');
  }

  /**
   * Fetch exchange rates from BNR (National Bank of Romania)
   * BNR publishes daily XML with exchange rates
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async fetchBNRRates(): Promise<void> {
    this.logger.log('Fetching BNR exchange rates...');

    try {
      // BNR XML feed URL
      const bnrUrl = 'https://www.bnr.ro/nbrfxrates.xml';

      const response = await fetch(bnrUrl, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'DocumentIulia/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`BNR API error: ${response.status}`);
      }

      const xmlText = await response.text();
      const rates = this.parseBNRXml(xmlText);

      if (rates.length > 0) {
        rates.forEach(rate => {
          this.rates.set(rate.currency, rate);

          // Store historical rate
          const historical = this.historicalRates.get(rate.currency) || [];
          historical.push({
            currency: rate.currency,
            date: rate.date,
            rate: rate.rate,
          });

          // Keep only last 30 days
          if (historical.length > 30) {
            historical.shift();
          }

          this.historicalRates.set(rate.currency, historical);
        });

        this.lastUpdate = new Date();
        this.logger.log(`Updated ${rates.length} exchange rates from BNR`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch BNR rates: ${error.message}`);
      // Keep using existing/default rates
    }
  }

  /**
   * Parse BNR XML response
   */
  private parseBNRXml(xml: string): ExchangeRate[] {
    const rates: ExchangeRate[] = [];

    try {
      // Simple XML parsing (in production, use a proper XML parser)
      const cubeMatch = xml.match(/<Cube date="([^"]+)">([\s\S]*?)<\/Cube>/);
      if (!cubeMatch) return rates;

      const dateStr = cubeMatch[1];
      const cubeContent = cubeMatch[2];
      const date = new Date(dateStr);

      // Match all Rate elements
      const rateRegex = /<Rate currency="([^"]+)"(?: multiplier="(\d+)")?>([^<]+)<\/Rate>/g;
      let match;

      while ((match = rateRegex.exec(cubeContent)) !== null) {
        const currency = match[1];
        const multiplier = match[2] ? parseInt(match[2]) : 1;
        const rate = parseFloat(match[3]);

        if (!isNaN(rate)) {
          rates.push({
            currency,
            name: this.currencyNames[currency] || currency,
            rate,
            multiplier,
            date,
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`Error parsing BNR XML: ${error.message}`);
    }

    return rates;
  }

  /**
   * Get current exchange rate for a currency
   */
  getRate(currency: string): ExchangeRate | null {
    const upperCurrency = currency.toUpperCase();
    return this.rates.get(upperCurrency) || null;
  }

  /**
   * Get all current exchange rates
   */
  getAllRates(): ExchangeRate[] {
    return Array.from(this.rates.values())
      .filter(r => r.currency !== 'RON')
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  /**
   * Convert amount between currencies
   */
  convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): CurrencyConversion {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Get rates (RON = 1)
    const fromRate = from === 'RON' ? 1 : (this.rates.get(from)?.rate || 1);
    const toRate = to === 'RON' ? 1 : (this.rates.get(to)?.rate || 1);

    const fromMultiplier = from === 'RON' ? 1 : (this.rates.get(from)?.multiplier || 1);
    const toMultiplier = to === 'RON' ? 1 : (this.rates.get(to)?.multiplier || 1);

    // Convert to RON first, then to target currency
    const amountInRon = amount * (fromRate / fromMultiplier);
    const convertedAmount = amountInRon / (toRate / toMultiplier);

    return {
      fromCurrency: from,
      toCurrency: to,
      fromAmount: amount,
      toAmount: Math.round(convertedAmount * 100) / 100,
      rate: (fromRate / fromMultiplier) / (toRate / toMultiplier),
      date: this.lastUpdate || new Date(),
    };
  }

  /**
   * Convert to RON
   */
  toRON(amount: number, fromCurrency: string): number {
    return this.convert(amount, fromCurrency, 'RON').toAmount;
  }

  /**
   * Convert from RON
   */
  fromRON(amount: number, toCurrency: string): number {
    return this.convert(amount, 'RON', toCurrency).toAmount;
  }

  /**
   * Get historical rates for a currency
   */
  getHistoricalRates(currency: string, days: number = 30): HistoricalRate[] {
    const upperCurrency = currency.toUpperCase();
    const historical = this.historicalRates.get(upperCurrency) || [];
    return historical.slice(-days);
  }

  /**
   * Get rate for a specific date (approximate)
   */
  getRateForDate(currency: string, date: Date): number | null {
    const historical = this.historicalRates.get(currency.toUpperCase());
    if (!historical || historical.length === 0) {
      return this.rates.get(currency.toUpperCase())?.rate || null;
    }

    // Find the closest date
    const targetTime = date.getTime();
    let closest = historical[0];
    let minDiff = Math.abs(targetTime - closest.date.getTime());

    for (const rate of historical) {
      const diff = Math.abs(targetTime - rate.date.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = rate;
      }
    }

    return closest.rate;
  }

  /**
   * Get last update time
   */
  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{ code: string; name: string }> {
    return Object.entries(this.currencyNames).map(([code, name]) => ({
      code,
      name,
    }));
  }

  /**
   * Format currency amount
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get exchange rate summary for dashboard
   */
  getSummary(): {
    mainRates: ExchangeRate[];
    lastUpdate: Date | null;
    trend: Record<string, 'up' | 'down' | 'stable'>;
  } {
    const mainCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];
    const mainRates = mainCurrencies
      .map(c => this.rates.get(c))
      .filter((r): r is ExchangeRate => r !== undefined);

    // Calculate trends based on historical data
    const trend: Record<string, 'up' | 'down' | 'stable'> = {};

    mainCurrencies.forEach(currency => {
      const historical = this.historicalRates.get(currency);
      if (historical && historical.length >= 2) {
        const latest = historical[historical.length - 1].rate;
        const previous = historical[historical.length - 2].rate;
        const change = ((latest - previous) / previous) * 100;

        if (change > 0.1) trend[currency] = 'up';
        else if (change < -0.1) trend[currency] = 'down';
        else trend[currency] = 'stable';
      } else {
        trend[currency] = 'stable';
      }
    });

    return {
      mainRates,
      lastUpdate: this.lastUpdate,
      trend,
    };
  }
}
