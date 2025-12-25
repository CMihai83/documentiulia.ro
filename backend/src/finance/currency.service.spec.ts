import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CurrencyService,
  SUPPORTED_CURRENCIES,
  Currency,
} from './currency.service';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(3600000), // 1 hour cache TTL
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);

    // Initialize with fallback rates (skip API calls in tests)
    (service as any).loadFallbackRates();
  });

  describe('getSupportedCurrencies', () => {
    it('should return all supported currencies', () => {
      const currencies = service.getSupportedCurrencies();

      expect(currencies).toBeInstanceOf(Array);
      expect(currencies.length).toBeGreaterThan(10);
      expect(currencies.some((c) => c.code === 'EUR')).toBe(true);
      expect(currencies.some((c) => c.code === 'RON')).toBe(true);
      expect(currencies.some((c) => c.code === 'USD')).toBe(true);
    });

    it('should have required fields for each currency', () => {
      const currencies = service.getSupportedCurrencies();

      for (const currency of currencies) {
        expect(currency.code).toBeDefined();
        expect(currency.name).toBeDefined();
        expect(currency.symbol).toBeDefined();
        expect(typeof currency.decimals).toBe('number');
      }
    });
  });

  describe('getCurrency', () => {
    it('should return currency info for valid code', () => {
      const eur = service.getCurrency('EUR');

      expect(eur).toBeDefined();
      expect(eur?.code).toBe('EUR');
      expect(eur?.name).toBe('Euro');
      expect(eur?.symbol).toBe('€');
      expect(eur?.decimals).toBe(2);
    });

    it('should handle lowercase currency codes', () => {
      const usd = service.getCurrency('usd');

      expect(usd).toBeDefined();
      expect(usd?.code).toBe('USD');
    });

    it('should return null for unsupported currency', () => {
      const invalid = service.getCurrency('XYZ');

      expect(invalid).toBeNull();
    });
  });

  describe('getCurrencyByCountry', () => {
    it('should return currency for country code', () => {
      const ron = service.getCurrencyByCountry('RO');

      expect(ron).toBeDefined();
      expect(ron?.code).toBe('RON');
    });

    it('should handle lowercase country codes', () => {
      const eur = service.getCurrencyByCountry('eu');

      expect(eur).toBeDefined();
      expect(eur?.code).toBe('EUR');
    });

    it('should return null for unknown country', () => {
      const unknown = service.getCurrencyByCountry('XX');

      expect(unknown).toBeNull();
    });
  });

  describe('isCurrencySupported', () => {
    it('should return true for supported currencies', () => {
      expect(service.isCurrencySupported('EUR')).toBe(true);
      expect(service.isCurrencySupported('RON')).toBe(true);
      expect(service.isCurrencySupported('USD')).toBe(true);
      expect(service.isCurrencySupported('GBP')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(service.isCurrencySupported('XYZ')).toBe(false);
      expect(service.isCurrencySupported('ABC')).toBe(false);
    });

    it('should handle lowercase input', () => {
      expect(service.isCurrencySupported('eur')).toBe(true);
      expect(service.isCurrencySupported('ron')).toBe(true);
    });
  });

  describe('getExchangeRate', () => {
    it('should return rate 1 for same currency', async () => {
      const rate = await service.getExchangeRate('EUR', 'EUR');

      expect(rate.rate).toBe(1);
      expect(rate.from).toBe('EUR');
      expect(rate.to).toBe('EUR');
    });

    it('should return exchange rate between different currencies', async () => {
      const rate = await service.getExchangeRate('EUR', 'RON');

      expect(rate.from).toBe('EUR');
      expect(rate.to).toBe('RON');
      expect(rate.rate).toBeGreaterThan(0);
      expect(rate.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate cross rates correctly', async () => {
      const eurRon = await service.getExchangeRate('EUR', 'RON');
      const ronEur = await service.getExchangeRate('RON', 'EUR');

      // RON/EUR should be inverse of EUR/RON
      expect(Math.abs(eurRon.rate * ronEur.rate - 1)).toBeLessThan(0.0001);
    });

    it('should throw for unsupported currency', async () => {
      await expect(service.getExchangeRate('XYZ', 'EUR')).rejects.toThrow(
        'Unsupported currency: XYZ',
      );
    });

    it('should handle case-insensitive currency codes', async () => {
      const rate = await service.getExchangeRate('eur', 'ron');

      expect(rate.from).toBe('EUR');
      expect(rate.to).toBe('RON');
    });
  });

  describe('getAllRates', () => {
    it('should return rates for all cached currencies', async () => {
      const rates = await service.getAllRates();

      expect(rates).toBeDefined();
      expect(rates['EUR']).toBeDefined();
      expect(rates['EUR'].rate).toBe(1);
      expect(rates['RON']).toBeDefined();
      expect(rates['RON'].rate).toBeGreaterThan(1);
    });

    it('should have EUR as base with rate 1', async () => {
      const rates = await service.getAllRates();

      expect(rates['EUR'].from).toBe('EUR');
      expect(rates['EUR'].rate).toBe(1);
    });
  });

  describe('getRatesForBase', () => {
    it('should return rates with EUR base', async () => {
      const rates = await service.getRatesForBase('EUR');

      expect(rates['EUR']).toBe(1);
      expect(rates['RON']).toBeGreaterThan(1);
      expect(rates['USD']).toBeGreaterThan(0);
    });

    it('should return rates with RON base', async () => {
      const rates = await service.getRatesForBase('RON');

      expect(rates['RON']).toBe(1);
      expect(rates['EUR']).toBeLessThan(1);
    });

    it('should throw for unsupported base currency', async () => {
      await expect(service.getRatesForBase('XYZ')).rejects.toThrow(
        'Unsupported base currency: XYZ',
      );
    });
  });

  describe('convert', () => {
    it('should convert between currencies', async () => {
      const result = await service.convert(100, 'EUR', 'RON');

      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('RON');
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBeGreaterThan(100);
      expect(result.rate).toBeGreaterThan(1);
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convert(100, 'EUR', 'EUR');

      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it('should round to correct decimal places', async () => {
      const result = await service.convert(100.123456, 'EUR', 'RON');

      // RON has 2 decimal places
      const decimalPlaces = result.convertedAmount.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should round to 0 decimals for JPY', async () => {
      const result = await service.convert(100, 'EUR', 'JPY');

      // JPY has 0 decimal places
      expect(Number.isInteger(result.convertedAmount)).toBe(true);
    });
  });

  describe('convertToMultiple', () => {
    it('should convert to multiple currencies', async () => {
      const results = await service.convertToMultiple(100, 'EUR', ['RON', 'USD', 'GBP']);

      expect(results).toHaveLength(3);
      expect(results.some((r) => r.toCurrency === 'RON')).toBe(true);
      expect(results.some((r) => r.toCurrency === 'USD')).toBe(true);
      expect(results.some((r) => r.toCurrency === 'GBP')).toBe(true);
    });

    it('should have correct original amount in all results', async () => {
      const results = await service.convertToMultiple(50, 'EUR', ['RON', 'USD']);

      for (const result of results) {
        expect(result.originalAmount).toBe(50);
        expect(result.fromCurrency).toBe('EUR');
      }
    });
  });

  describe('getEquivalentAmounts', () => {
    it('should return equivalents in all currencies', async () => {
      const equivalents = await service.getEquivalentAmounts(100, 'EUR');

      expect(equivalents['EUR']).toBe(100);
      expect(equivalents['RON']).toBeGreaterThan(0);
      expect(equivalents['USD']).toBeGreaterThan(0);
    });

    it('should have base currency unchanged', async () => {
      const equivalents = await service.getEquivalentAmounts(500, 'RON');

      expect(equivalents['RON']).toBe(500);
    });
  });

  describe('formatCurrency', () => {
    it('should format EUR with symbol', () => {
      const formatted = service.formatCurrency(1234.56, 'EUR', { locale: 'de-DE' });

      expect(formatted).toContain('€');
      expect(formatted).toContain('1.234,56');
    });

    it('should format USD with symbol', () => {
      const formatted = service.formatCurrency(1234.56, 'USD', { locale: 'en-US' });

      expect(formatted).toContain('$');
      expect(formatted).toContain('1,234.56');
    });

    it('should format RON correctly', () => {
      const formatted = service.formatRON(1234.56);

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should format EUR correctly', () => {
      const formatted = service.formatEUR(1234.56);

      expect(formatted).toBeDefined();
      expect(formatted).toContain('€');
    });

    it('should format without symbol when specified', () => {
      const formatted = service.formatCurrency(1234.56, 'EUR', {
        locale: 'en-US',
        showSymbol: false,
        showCode: true,
      });

      expect(formatted).toContain('EUR');
      expect(formatted).not.toContain('€');
    });

    it('should handle custom decimal places', () => {
      const formatted = service.formatCurrency(1234.5678, 'EUR', {
        locale: 'en-US',
        decimals: 4,
      });

      // The formatted string includes thousand separator and currency symbol
      expect(formatted).toContain('1,234.5678');
    });
  });

  describe('roundToCurrency', () => {
    it('should round to 2 decimals for EUR', () => {
      const rounded = service.roundToCurrency(123.456789, 'EUR');

      expect(rounded).toBe(123.46);
    });

    it('should round to 0 decimals for JPY', () => {
      const rounded = service.roundToCurrency(123.456789, 'JPY');

      expect(rounded).toBe(123);
    });

    it('should round to 0 decimals for HUF', () => {
      const rounded = service.roundToCurrency(12345.678, 'HUF');

      expect(rounded).toBe(12346);
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status', () => {
      const status = service.getCacheStatus();

      expect(status).toBeDefined();
      expect(typeof status.isValid).toBe('boolean');
      expect(status.ratesCount).toBeGreaterThan(0);
      expect(status.ttlMs).toBe(3600000);
    });

    it('should have valid cache after loading fallback rates', () => {
      const status = service.getCacheStatus();

      expect(status.isValid).toBe(true);
      expect(status.lastUpdate).toBeInstanceOf(Date);
    });
  });

  describe('calculateMultiCurrencyTotal', () => {
    it('should calculate total from multiple currencies', async () => {
      const items = [
        { amount: 100, currency: 'EUR' },
        { amount: 500, currency: 'RON' },
        { amount: 50, currency: 'USD' },
      ];

      const result = await service.calculateMultiCurrencyTotal(items, 'EUR');

      expect(result.currency).toBe('EUR');
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown).toHaveLength(3);
    });

    it('should provide breakdown with conversion details', async () => {
      const items = [
        { amount: 100, currency: 'EUR' },
        { amount: 100, currency: 'USD' },
      ];

      const result = await service.calculateMultiCurrencyTotal(items, 'RON');

      for (const item of result.breakdown) {
        expect(item.originalAmount).toBeDefined();
        expect(item.originalCurrency).toBeDefined();
        expect(item.convertedAmount).toBeDefined();
        expect(item.rate).toBeDefined();
      }
    });

    it('should sum correctly when all same currency', async () => {
      const items = [
        { amount: 100, currency: 'EUR' },
        { amount: 200, currency: 'EUR' },
        { amount: 50, currency: 'EUR' },
      ];

      const result = await service.calculateMultiCurrencyTotal(items, 'EUR');

      expect(result.total).toBe(350);
    });
  });

  describe('getHistoricalRates', () => {
    it('should return historical rates array', async () => {
      const history = await service.getHistoricalRates('EUR', 'RON', 7);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBe(8); // 7 days + today
    });

    it('should have required fields in each entry', async () => {
      const history = await service.getHistoricalRates('EUR', 'USD', 5);

      for (const entry of history) {
        expect(entry.date).toBeInstanceOf(Date);
        expect(entry.from).toBe('EUR');
        expect(entry.to).toBe('USD');
        expect(entry.rate).toBeGreaterThan(0);
      }
    });

    it('should default to 30 days', async () => {
      const history = await service.getHistoricalRates('EUR', 'RON');

      expect(history.length).toBe(31); // 30 days + today
    });
  });

  describe('forceRefresh', () => {
    it('should return success status', async () => {
      // Mock fetch to avoid actual API calls
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.forceRefresh();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.ratesCount).toBe('number');
    });
  });

  describe('SUPPORTED_CURRENCIES constant', () => {
    it('should include major world currencies', () => {
      expect(SUPPORTED_CURRENCIES['EUR']).toBeDefined();
      expect(SUPPORTED_CURRENCIES['USD']).toBeDefined();
      expect(SUPPORTED_CURRENCIES['GBP']).toBeDefined();
      expect(SUPPORTED_CURRENCIES['CHF']).toBeDefined();
      expect(SUPPORTED_CURRENCIES['JPY']).toBeDefined();
    });

    it('should include Romanian Leu', () => {
      expect(SUPPORTED_CURRENCIES['RON']).toBeDefined();
      expect(SUPPORTED_CURRENCIES['RON'].name).toBe('Romanian Leu');
      expect(SUPPORTED_CURRENCIES['RON'].country).toBe('RO');
    });

    it('should include Eastern European currencies', () => {
      expect(SUPPORTED_CURRENCIES['PLN']).toBeDefined(); // Polish Zloty
      expect(SUPPORTED_CURRENCIES['CZK']).toBeDefined(); // Czech Koruna
      expect(SUPPORTED_CURRENCIES['HUF']).toBeDefined(); // Hungarian Forint
      expect(SUPPORTED_CURRENCIES['BGN']).toBeDefined(); // Bulgarian Lev
    });

    it('should include Nordic currencies', () => {
      expect(SUPPORTED_CURRENCIES['SEK']).toBeDefined(); // Swedish Krona
      expect(SUPPORTED_CURRENCIES['DKK']).toBeDefined(); // Danish Krone
      expect(SUPPORTED_CURRENCIES['NOK']).toBeDefined(); // Norwegian Krone
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount conversion', async () => {
      const result = await service.convert(0, 'EUR', 'RON');

      expect(result.convertedAmount).toBe(0);
    });

    it('should handle very large amounts', async () => {
      const result = await service.convert(1000000000, 'EUR', 'RON');

      expect(result.convertedAmount).toBeGreaterThan(0);
      expect(Number.isFinite(result.convertedAmount)).toBe(true);
    });

    it('should handle very small amounts', async () => {
      const result = await service.convert(0.01, 'EUR', 'RON');

      expect(result.convertedAmount).toBeGreaterThan(0);
    });

    it('should handle negative amounts', async () => {
      const result = await service.convert(-100, 'EUR', 'RON');

      expect(result.convertedAmount).toBeLessThan(0);
    });
  });
});
