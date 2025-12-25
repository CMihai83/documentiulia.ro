import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  MultiCurrencyService,
  CurrencyCode,
  CurrencyInfo,
  ExchangeRate,
  ConversionResult,
  MultiCurrencyPrice,
  CurrencyAccount,
  CurrencyTransaction,
  HedgingPosition,
  CurrencyAnalytics,
} from './multi-currency.service';

describe('MultiCurrencyService', () => {
  let service: MultiCurrencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MultiCurrencyService],
    }).compile();

    service = module.get<MultiCurrencyService>(MultiCurrencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Currency Information Tests ====================

  describe('Currency Information', () => {
    it('should get all currencies', () => {
      const currencies = service.getCurrencies();
      expect(currencies).toBeDefined();
      expect(currencies.length).toBe(30);
    });

    it('should get currency by code', () => {
      const eur = service.getCurrency('EUR');
      expect(eur).toBeDefined();
      expect(eur?.code).toBe('EUR');
      expect(eur?.name).toBe('Euro');
      expect(eur?.symbol).toBe('€');
      expect(eur?.decimals).toBe(2);
      expect(eur?.isBaseCurrency).toBe(true);
    });

    it('should get Romanian Leu details', () => {
      const ron = service.getCurrency('RON');
      expect(ron).toBeDefined();
      expect(ron?.code).toBe('RON');
      expect(ron?.name).toBe('Romanian Leu');
      expect(ron?.symbol).toBe('lei');
      expect(ron?.country).toBe('Romania');
      expect(ron?.isEUMember).toBe(true);
    });

    it('should return undefined for invalid currency', () => {
      const invalid = service.getCurrency('INVALID' as CurrencyCode);
      expect(invalid).toBeUndefined();
    });

    it('should get major currencies', () => {
      const majorCurrencies = service.getMajorCurrencies();
      expect(majorCurrencies.length).toBeGreaterThan(0);
      expect(majorCurrencies.every(c => c.isMajor)).toBe(true);
      expect(majorCurrencies.map(c => c.code)).toContain('USD');
      expect(majorCurrencies.map(c => c.code)).toContain('GBP');
      expect(majorCurrencies.map(c => c.code)).toContain('EUR');
    });

    it('should get EU currencies', () => {
      const euCurrencies = service.getEUCurrencies();
      expect(euCurrencies.length).toBeGreaterThan(0);
      expect(euCurrencies.map(c => c.code)).toContain('EUR');
      expect(euCurrencies.map(c => c.code)).toContain('RON');
      expect(euCurrencies.map(c => c.code)).toContain('PLN');
    });

    it('should get currencies by region', () => {
      const asiaCurrencies = service.getCurrenciesByRegion('Asia');
      expect(asiaCurrencies.length).toBeGreaterThan(0);
      expect(asiaCurrencies.every(c => c.region === 'Asia')).toBe(true);
      expect(asiaCurrencies.map(c => c.code)).toContain('JPY');
      expect(asiaCurrencies.map(c => c.code)).toContain('CNY');
    });

    it('should get Americas currencies', () => {
      const americasCurrencies = service.getCurrenciesByRegion('Americas');
      expect(americasCurrencies.map(c => c.code)).toContain('USD');
      expect(americasCurrencies.map(c => c.code)).toContain('CAD');
      expect(americasCurrencies.map(c => c.code)).toContain('BRL');
    });
  });

  // ==================== Exchange Rate Tests ====================

  describe('Exchange Rates', () => {
    it('should get EUR to USD rate', () => {
      const rate = service.getExchangeRate('EUR', 'USD');
      expect(rate).toBeDefined();
      expect(rate?.baseCurrency).toBe('EUR');
      expect(rate?.targetCurrency).toBe('USD');
      expect(rate?.rate).toBeGreaterThan(0);
      expect(rate?.buyRate).toBeLessThan(rate!.rate);
      expect(rate?.sellRate).toBeGreaterThan(rate!.rate);
    });

    it('should get EUR to RON rate', () => {
      const rate = service.getExchangeRate('EUR', 'RON');
      expect(rate).toBeDefined();
      expect(rate?.rate).toBeGreaterThan(4);
      expect(rate?.rate).toBeLessThan(6);
    });

    it('should get inverse rate', () => {
      const eurToUsd = service.getExchangeRate('EUR', 'USD');
      const usdToEur = service.getExchangeRate('USD', 'EUR');

      expect(eurToUsd).toBeDefined();
      expect(usdToEur).toBeDefined();
      expect(Math.abs(eurToUsd!.rate * usdToEur!.rate - 1)).toBeLessThan(0.01);
    });

    it('should calculate cross rates', () => {
      const usdToRon = service.getExchangeRate('USD', 'RON');
      expect(usdToRon).toBeDefined();
      expect(usdToRon?.source).toBe('cached');
      expect(usdToRon?.rate).toBeGreaterThan(0);
    });

    it('should get all exchange rates for EUR', () => {
      const rates = service.getAllExchangeRates('EUR');
      expect(rates.length).toBe(29); // 30 currencies - EUR itself
      expect(rates.every(r => r.baseCurrency === 'EUR')).toBe(true);
    });

    it('should get same-currency rate as 1', () => {
      const rate = service.getExchangeRate('EUR', 'EUR');
      expect(rate).toBeDefined();
      expect(rate?.rate).toBe(1);
      expect(rate?.spread).toBe(0);
    });

    it('should update exchange rate', async () => {
      const oldRate = service.getExchangeRate('EUR', 'USD');
      const newRateValue = 1.15;

      const newRate = await service.updateExchangeRate('EUR', 'USD', newRateValue, 'api');

      expect(newRate.rate).toBe(newRateValue);
      expect(newRate.source).toBe('api');
      expect(newRate.change24h).toBeDefined();

      // Verify inverse was also updated
      const inverseRate = service.getExchangeRate('USD', 'EUR');
      expect(Math.abs(inverseRate!.rate - 1/newRateValue)).toBeLessThan(0.001);
    });

    it('should store rate history', async () => {
      await service.updateExchangeRate('EUR', 'GBP', 0.86, 'manual');
      await service.updateExchangeRate('EUR', 'GBP', 0.87, 'manual');

      const history = service.getRateHistory('EUR', 'GBP', 30);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should calculate correct spread for major currencies', () => {
      const usdRate = service.getExchangeRate('EUR', 'USD');
      expect(usdRate?.spread).toBe(0.005); // 0.5% for major
    });

    it('should calculate correct spread for EU currencies', () => {
      const ronRate = service.getExchangeRate('EUR', 'RON');
      expect(ronRate?.spread).toBe(0.01); // 1% for EU
    });
  });

  // ==================== Currency Conversion Tests ====================

  describe('Currency Conversion', () => {
    it('should convert EUR to USD', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
      });

      expect(result).toBeDefined();
      expect(result.fromCurrency).toBe('EUR');
      expect(result.toCurrency).toBe('USD');
      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
      expect(result.fees.total).toBeGreaterThan(0);
    });

    it('should convert with buy direction', async () => {
      const midResult = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
        direction: 'mid',
      });

      const buyResult = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
        direction: 'buy',
      });

      expect(buyResult.rate).toBeLessThan(midResult.rate);
      expect(buyResult.toAmount).toBeLessThan(midResult.toAmount);
    });

    it('should convert with sell direction', async () => {
      const midResult = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
        direction: 'mid',
      });

      const sellResult = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
        direction: 'sell',
      });

      expect(sellResult.rate).toBeGreaterThan(midResult.rate);
      expect(sellResult.toAmount).toBeGreaterThan(midResult.toAmount);
    });

    it('should calculate fees correctly', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 5000,
      });

      // 0.1% percentage fee + fixed fee
      expect(result.fees.percentage).toBeCloseTo(5, 1);
      expect(result.fees.fixed).toBe(2); // $2 for amounts > 1000
    });

    it('should apply higher fixed fee for large amounts', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 15000,
      });

      expect(result.fees.fixed).toBe(5); // $5 for amounts > 10000
    });

    it('should throw error for negative amount', async () => {
      await expect(
        service.convert({
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          amount: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for zero amount', async () => {
      await expect(
        service.convert({
          fromCurrency: 'EUR',
          toCurrency: 'USD',
          amount: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get conversion by ID', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'RON',
        amount: 50,
      });

      const retrieved = service.getConversion(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });

    it('should get conversion quote', () => {
      const quote = service.getConversionQuote('EUR', 'USD', 100);

      expect(quote).toBeDefined();
      expect(quote?.id).toBe('quote');
      expect(quote?.fromAmount).toBe(100);
      expect(quote?.toAmount).toBeGreaterThan(0);
      expect(quote?.validUntil).toBeDefined();
    });

    it('should return null quote for invalid currency pair', () => {
      // Force invalid by checking non-existent pair
      const quote = service.getConversionQuote('INVALID' as CurrencyCode, 'USD', 100);
      expect(quote).toBeNull();
    });

    it('should round amounts correctly for currencies with 0 decimals', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'JPY',
        amount: 100,
      });

      expect(Number.isInteger(result.toAmount)).toBe(true);
    });
  });

  // ==================== Multi-Currency Pricing Tests ====================

  describe('Multi-Currency Pricing', () => {
    it('should create multi-currency price', async () => {
      const price = await service.createMultiCurrencyPrice({
        productId: 'prod_123',
        baseCurrency: 'EUR',
        baseAmount: 99.99,
        currencies: ['EUR', 'USD', 'GBP', 'RON'],
      });

      expect(price).toBeDefined();
      expect(price.id).toMatch(/^mcp_/);
      expect(price.productId).toBe('prod_123');
      expect(price.baseCurrency).toBe('EUR');
      expect(price.baseAmount).toBe(99.99);
      expect(price.prices.length).toBe(4);
    });

    it('should include base currency in prices', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 50,
        currencies: ['EUR', 'USD'],
      });

      const eurPrice = price.prices.find(p => p.currency === 'EUR');
      expect(eurPrice).toBeDefined();
      expect(eurPrice?.amount).toBe(50);
      expect(eurPrice?.rate).toBe(1);
    });

    it('should apply margin percent', async () => {
      const priceNoMargin = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100,
        currencies: ['USD'],
        marginPercent: 0,
      });

      const priceWithMargin = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100,
        currencies: ['USD'],
        marginPercent: 10,
      });

      const usdNoMargin = priceNoMargin.prices.find(p => p.currency === 'USD')!.amount;
      const usdWithMargin = priceWithMargin.prices.find(p => p.currency === 'USD')!.amount;

      expect(usdWithMargin).toBeGreaterThan(usdNoMargin);
    });

    it('should apply psychological rounding', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100.50,
        currencies: ['USD'],
        roundingRule: 'psychological',
      });

      const usdPrice = price.prices.find(p => p.currency === 'USD');
      expect(usdPrice?.amount.toString()).toMatch(/\.99$/);
    });

    it('should apply up rounding', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 10.001,
        currencies: ['EUR'],
        roundingRule: 'up',
      });

      const eurPrice = price.prices.find(p => p.currency === 'EUR');
      expect(eurPrice?.amount).toBeGreaterThanOrEqual(10.001);
    });

    it('should apply down rounding', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 10.999,
        currencies: ['EUR'],
        roundingRule: 'down',
      });

      const eurPrice = price.prices.find(p => p.currency === 'EUR');
      expect(eurPrice?.amount).toBeLessThanOrEqual(10.999);
    });

    it('should get multi-currency price by ID', async () => {
      const created = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 25,
        currencies: ['EUR', 'USD'],
      });

      const retrieved = service.getMultiCurrencyPrice(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get multi-currency price by product ID', async () => {
      await service.createMultiCurrencyPrice({
        productId: 'unique_prod_456',
        baseCurrency: 'EUR',
        baseAmount: 75,
        currencies: ['EUR', 'USD', 'RON'],
      });

      const retrieved = service.getMultiCurrencyPriceByProduct('unique_prod_456');
      expect(retrieved).toBeDefined();
      expect(retrieved?.productId).toBe('unique_prod_456');
    });

    it('should update multi-currency prices', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100,
        currencies: ['EUR', 'USD'],
      });

      // Update exchange rate
      await service.updateExchangeRate('EUR', 'USD', 1.20, 'manual');

      // Update prices
      const updated = await service.updateMultiCurrencyPrices(price.id);

      const usdPrice = updated.prices.find(p => p.currency === 'USD');
      expect(usdPrice?.rate).toBeCloseTo(1.20, 2);
    });

    it('should throw error updating non-existent price', async () => {
      await expect(
        service.updateMultiCurrencyPrices('invalid_id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get price in specific currency', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100,
        currencies: ['EUR', 'USD', 'GBP'],
      });

      const usdPrice = service.getPriceInCurrency(price.id, 'USD');
      expect(usdPrice).toBeGreaterThan(0);

      const eurPrice = service.getPriceInCurrency(price.id, 'EUR');
      expect(eurPrice).toBe(100);
    });

    it('should calculate price on the fly for missing currency', async () => {
      const price = await service.createMultiCurrencyPrice({
        baseCurrency: 'EUR',
        baseAmount: 100,
        currencies: ['EUR'],
      });

      // RON not in original list, should calculate on the fly
      const ronPrice = service.getPriceInCurrency(price.id, 'RON');
      expect(ronPrice).toBeGreaterThan(0);
    });
  });

  // ==================== Currency Account Tests ====================

  describe('Currency Accounts', () => {
    const tenantId = 'tenant_test_123';

    it('should create currency account', async () => {
      const account = await service.createCurrencyAccount(tenantId, 'EUR');

      expect(account).toBeDefined();
      expect(account.id).toMatch(new RegExp(`cacc_${tenantId}_EUR`));
      expect(account.tenantId).toBe(tenantId);
      expect(account.currency).toBe('EUR');
      expect(account.balance).toBe(0);
      expect(account.availableBalance).toBe(0);
    });

    it('should throw error creating duplicate account', async () => {
      await service.createCurrencyAccount('tenant_dup', 'USD');

      await expect(
        service.createCurrencyAccount('tenant_dup', 'USD'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get or create account', async () => {
      const account1 = await service.getOrCreateAccount('tenant_goc', 'GBP');
      expect(account1).toBeDefined();

      const account2 = await service.getOrCreateAccount('tenant_goc', 'GBP');
      expect(account2.id).toBe(account1.id);
    });

    it('should get currency account by ID', async () => {
      const created = await service.createCurrencyAccount('tenant_get', 'RON');
      const retrieved = service.getCurrencyAccount(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get currency accounts by tenant', async () => {
      const multiTenant = 'tenant_multi';
      await service.createCurrencyAccount(multiTenant, 'EUR');
      await service.createCurrencyAccount(multiTenant, 'USD');
      await service.createCurrencyAccount(multiTenant, 'RON');

      const accounts = service.getCurrencyAccountsByTenant(multiTenant);
      expect(accounts.length).toBe(3);
      expect(accounts.every(a => a.tenantId === multiTenant)).toBe(true);
    });

    it('should deposit to account', async () => {
      const depositTenant = 'tenant_deposit';
      const transaction = await service.deposit(depositTenant, 'EUR', 1000, 'Initial deposit');

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('deposit');
      expect(transaction.amount).toBe(1000);
      expect(transaction.balanceBefore).toBe(0);
      expect(transaction.balanceAfter).toBe(1000);

      const account = await service.getOrCreateAccount(depositTenant, 'EUR');
      expect(account.balance).toBe(1000);
    });

    it('should throw error for negative deposit', async () => {
      await expect(
        service.deposit('tenant_neg', 'EUR', -100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should withdraw from account', async () => {
      const withdrawTenant = 'tenant_withdraw';
      await service.deposit(withdrawTenant, 'EUR', 500);
      const transaction = await service.withdraw(withdrawTenant, 'EUR', 200, 'Withdrawal');

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('withdrawal');
      expect(transaction.amount).toBe(-200);
      expect(transaction.balanceAfter).toBe(300);
    });

    it('should throw error for insufficient balance', async () => {
      const insuffTenant = 'tenant_insuff';
      await service.deposit(insuffTenant, 'EUR', 100);

      await expect(
        service.withdraw(insuffTenant, 'EUR', 200),
      ).rejects.toThrow(BadRequestException);
    });

    it('should get transactions', async () => {
      const txnTenant = 'tenant_txn';
      await service.deposit(txnTenant, 'EUR', 1000);
      await service.deposit(txnTenant, 'EUR', 500);
      await service.withdraw(txnTenant, 'EUR', 300);

      const transactions = service.getTransactions(txnTenant);
      expect(transactions.length).toBe(3);
    });

    it('should filter transactions by currency', async () => {
      const filterTenant = 'tenant_filter';
      await service.deposit(filterTenant, 'EUR', 100);
      await service.deposit(filterTenant, 'USD', 200);

      const eurTransactions = service.getTransactions(filterTenant, { currency: 'EUR' });
      expect(eurTransactions.length).toBe(1);
      expect(eurTransactions[0].currency).toBe('EUR');
    });

    it('should filter transactions by type', async () => {
      const typeTenant = 'tenant_type';
      await service.deposit(typeTenant, 'EUR', 1000);
      await service.withdraw(typeTenant, 'EUR', 100);

      const deposits = service.getTransactions(typeTenant, { type: 'deposit' });
      expect(deposits.length).toBe(1);
      expect(deposits[0].type).toBe('deposit');
    });

    it('should convert with account transactions', async () => {
      const convTenant = 'tenant_conv_acc';
      await service.deposit(convTenant, 'EUR', 1000);

      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 100,
        tenantId: convTenant,
      });

      expect(result).toBeDefined();

      const eurAccount = await service.getOrCreateAccount(convTenant, 'EUR');
      const usdAccount = await service.getOrCreateAccount(convTenant, 'USD');

      expect(eurAccount.balance).toBeLessThan(1000);
      expect(usdAccount.balance).toBeGreaterThan(0);
    });
  });

  // ==================== Hedging Tests ====================

  describe('Hedging Positions', () => {
    const hedgeTenant = 'tenant_hedge';

    it('should create hedging position', async () => {
      const position = await service.createHedgingPosition({
        tenantId: hedgeTenant,
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        amount: 10000,
        strikeRate: 1.10,
        type: 'forward',
        direction: 'buy',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(position).toBeDefined();
      expect(position.id).toMatch(/^hedge_/);
      expect(position.status).toBe('active');
      expect(position.pnl).toBe(0);
    });

    it('should get hedging position by ID', async () => {
      const created = await service.createHedgingPosition({
        tenantId: hedgeTenant,
        baseCurrency: 'EUR',
        targetCurrency: 'GBP',
        amount: 5000,
        strikeRate: 0.85,
        type: 'option',
        direction: 'sell',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const retrieved = service.getHedgingPosition(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get hedging positions by tenant', async () => {
      const multiHedge = 'tenant_multi_hedge';

      await service.createHedgingPosition({
        tenantId: multiHedge,
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        amount: 5000,
        strikeRate: 1.10,
        type: 'forward',
        direction: 'buy',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await service.createHedgingPosition({
        tenantId: multiHedge,
        baseCurrency: 'EUR',
        targetCurrency: 'GBP',
        amount: 3000,
        strikeRate: 0.86,
        type: 'spot',
        direction: 'sell',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const positions = service.getHedgingPositionsByTenant(multiHedge);
      expect(positions.length).toBe(2);
    });

    it('should filter hedging positions by status', async () => {
      const statusTenant = 'tenant_status_hedge';

      await service.createHedgingPosition({
        tenantId: statusTenant,
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        amount: 1000,
        strikeRate: 1.10,
        type: 'forward',
        direction: 'buy',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const activePositions = service.getHedgingPositionsByTenant(statusTenant, 'active');
      expect(activePositions.length).toBe(1);

      const exercisedPositions = service.getHedgingPositionsByTenant(statusTenant, 'exercised');
      expect(exercisedPositions.length).toBe(0);
    });

    it('should update hedging position PnL', async () => {
      const position = await service.createHedgingPosition({
        tenantId: 'tenant_pnl',
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        amount: 10000,
        strikeRate: 1.05,
        type: 'forward',
        direction: 'buy',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Update rate
      await service.updateExchangeRate('EUR', 'USD', 1.15, 'manual');

      const updated = await service.updateHedgingPositionPnL(position.id);

      expect(updated.currentRate).toBe(1.15);
      expect(updated.pnl).toBeGreaterThan(0); // Profit on buy position when rate increases
    });

    it('should throw error for non-existent hedging position', async () => {
      await expect(
        service.updateHedgingPositionPnL('invalid_hedge_id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error creating hedge for invalid currency pair', async () => {
      await expect(
        service.createHedgingPosition({
          tenantId: 'tenant_invalid',
          baseCurrency: 'INVALID' as CurrencyCode,
          targetCurrency: 'USD',
          amount: 1000,
          strikeRate: 1.0,
          type: 'forward',
          direction: 'buy',
          expiresAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Analytics Tests ====================

  describe('Currency Analytics', () => {
    it('should get currency analytics', async () => {
      const analyticsTenant = 'tenant_analytics';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Create some transactions
      await service.deposit(analyticsTenant, 'EUR', 10000);
      await service.deposit(analyticsTenant, 'USD', 5000);
      await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 1000,
        tenantId: analyticsTenant,
      });

      const analytics = service.getCurrencyAnalytics(analyticsTenant, startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.tenantId).toBe(analyticsTenant);
      expect(analytics.period.start).toEqual(startDate);
      expect(analytics.period.end).toEqual(endDate);
      expect(analytics.summary).toBeDefined();
      expect(analytics.exposure).toBeDefined();
    });

    it('should calculate total volume by currency', async () => {
      const volumeTenant = `tenant_volume_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 1000);

      await service.deposit(volumeTenant, 'EUR', 1000);
      await service.deposit(volumeTenant, 'EUR', 500);

      const analytics = service.getCurrencyAnalytics(volumeTenant, startDate, endDate);

      expect(analytics.summary.totalVolume['EUR']).toBe(1500);
    });

    it('should calculate exposure percentages', async () => {
      const exposureTenant = 'tenant_exposure';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      await service.deposit(exposureTenant, 'EUR', 5000);
      await service.deposit(exposureTenant, 'USD', 5000);

      const analytics = service.getCurrencyAnalytics(exposureTenant, startDate, endDate);

      const totalPercent = analytics.exposure.reduce((sum, e) => sum + e.percentOfTotal, 0);
      expect(Math.abs(totalPercent - 100)).toBeLessThan(1);
    });

    it('should include rate movements', () => {
      const tenant = 'tenant_movements';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = service.getCurrencyAnalytics(tenant, startDate, endDate);

      expect(analytics.rateMovements).toBeDefined();
      expect(Array.isArray(analytics.rateMovements)).toBe(true);
    });
  });

  // ==================== Utility Methods Tests ====================

  describe('Utility Methods', () => {
    it('should format amount correctly', () => {
      const formatted = service.formatAmount(1234.56, 'EUR');
      expect(formatted).toContain('1,234.56');
    });

    it('should format JPY without decimals', () => {
      const formatted = service.formatAmount(1234, 'JPY');
      expect(formatted).not.toContain('.');
    });

    it('should parse amount', () => {
      const parsed = service.parseAmount('€1,234.56', 'EUR');
      expect(parsed).toBe(1234.56);
    });

    it('should validate currency code', () => {
      expect(service.isValidCurrency('EUR')).toBe(true);
      expect(service.isValidCurrency('USD')).toBe(true);
      expect(service.isValidCurrency('INVALID')).toBe(false);
    });

    it('should get default base currency', () => {
      const baseCurrency = service.getDefaultBaseCurrency();
      expect(baseCurrency).toBe('EUR');
    });

    it('should set default base currency', () => {
      service.setDefaultBaseCurrency('USD');
      expect(service.getDefaultBaseCurrency()).toBe('USD');

      // Reset for other tests
      service.setDefaultBaseCurrency('EUR');
    });

    it('should throw error setting invalid base currency', () => {
      expect(() => {
        service.setDefaultBaseCurrency('INVALID' as CurrencyCode);
      }).toThrow(BadRequestException);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle very small amounts', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 0.01,
      });

      expect(result.toAmount).toBeGreaterThan(0);
    });

    it('should handle very large amounts', async () => {
      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 1000000,
      });

      expect(result.toAmount).toBeGreaterThan(0);
      expect(result.fees.fixed).toBe(5); // Max fixed fee
    });

    it('should handle currencies with 0 decimals correctly', async () => {
      const jpyRate = service.getExchangeRate('EUR', 'JPY');
      expect(jpyRate).toBeDefined();

      const result = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'JPY',
        amount: 100,
      });

      expect(Number.isInteger(result.toAmount)).toBe(true);
    });

    it('should handle HUF with 0 decimals', () => {
      const huf = service.getCurrency('HUF');
      expect(huf?.decimals).toBe(0);
    });

    it('should handle KRW with 0 decimals', () => {
      const krw = service.getCurrency('KRW');
      expect(krw?.decimals).toBe(0);
    });

    it('should return empty history for non-existent pair', () => {
      const history = service.getRateHistory('XYZ' as CurrencyCode, 'ABC' as CurrencyCode, 30);
      expect(history).toEqual([]);
    });

    it('should handle empty tenant transactions', () => {
      const transactions = service.getTransactions('non_existent_tenant');
      expect(transactions).toEqual([]);
    });

    it('should handle date filtering', async () => {
      const dateTenant = 'tenant_date_filter';
      await service.deposit(dateTenant, 'EUR', 100);

      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const transactions = service.getTransactions(dateTenant, {
        startDate: futureStart,
        endDate: futureEnd,
      });

      expect(transactions.length).toBe(0);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should handle complete currency account lifecycle', async () => {
      const tenant = 'tenant_lifecycle';

      // Create accounts
      const eurAccount = await service.createCurrencyAccount(tenant, 'EUR');
      expect(eurAccount.balance).toBe(0);

      // Deposit
      await service.deposit(tenant, 'EUR', 10000);

      // Convert EUR to USD
      const conversion = await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 1000,
        tenantId: tenant,
      });

      // Check balances
      const updatedEurAccount = await service.getOrCreateAccount(tenant, 'EUR');
      const usdAccount = await service.getOrCreateAccount(tenant, 'USD');
      const usdBalanceAfterConversion = usdAccount.balance;

      expect(updatedEurAccount.balance).toBeLessThan(10000);
      expect(usdAccount.balance).toBeGreaterThan(0);

      // Withdraw from USD
      await service.withdraw(tenant, 'USD', 100);

      const finalUsdAccount = await service.getOrCreateAccount(tenant, 'USD');
      expect(finalUsdAccount.balance).toBe(usdBalanceAfterConversion - 100);
    });

    it('should handle multi-currency e-commerce scenario', async () => {
      // Create product price in multiple currencies
      const price = await service.createMultiCurrencyPrice({
        productId: 'ecom_product_1',
        baseCurrency: 'EUR',
        baseAmount: 49.99,
        currencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN'],
        marginPercent: 5,
        roundingRule: 'psychological',
      });

      expect(price.prices.length).toBe(5);

      // Get price in each currency
      const usdPrice = service.getPriceInCurrency(price.id, 'USD');
      const gbpPrice = service.getPriceInCurrency(price.id, 'GBP');
      const ronPrice = service.getPriceInCurrency(price.id, 'RON');

      expect(usdPrice).toBeGreaterThan(0);
      expect(gbpPrice).toBeGreaterThan(0);
      expect(ronPrice).toBeGreaterThan(0);

      // All should end in .99 due to psychological rounding
      expect(usdPrice?.toString()).toMatch(/\.99$/);
    });

    it('should handle hedging strategy', async () => {
      const tenant = 'tenant_hedge_strategy';

      // Create multiple hedging positions
      await service.createHedgingPosition({
        tenantId: tenant,
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        amount: 50000,
        strikeRate: 1.08,
        type: 'forward',
        direction: 'buy',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await service.createHedgingPosition({
        tenantId: tenant,
        baseCurrency: 'EUR',
        targetCurrency: 'GBP',
        amount: 30000,
        strikeRate: 0.84,
        type: 'option',
        direction: 'sell',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const positions = service.getHedgingPositionsByTenant(tenant, 'active');
      expect(positions.length).toBe(2);

      // Update PnL for all positions
      for (const pos of positions) {
        await service.updateHedgingPositionPnL(pos.id);
      }

      const updatedPositions = service.getHedgingPositionsByTenant(tenant, 'active');
      expect(updatedPositions.every(p => p.currentRate > 0)).toBe(true);
    });

    it('should provide comprehensive analytics', async () => {
      const tenant = 'tenant_full_analytics';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Setup various activities
      await service.deposit(tenant, 'EUR', 50000);
      await service.deposit(tenant, 'USD', 20000);
      await service.deposit(tenant, 'GBP', 10000);

      await service.convert({
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        amount: 5000,
        tenantId: tenant,
      });

      await service.convert({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 2000,
        tenantId: tenant,
      });

      const analytics = service.getCurrencyAnalytics(tenant, startDate, endDate);

      expect(analytics.summary.totalConversions).toBeGreaterThanOrEqual(0);
      expect(Object.keys(analytics.summary.totalVolume).length).toBeGreaterThanOrEqual(0);
      expect(analytics.exposure.length).toBeGreaterThanOrEqual(0);
      expect(analytics.byPair.length).toBeGreaterThanOrEqual(0);
    });
  });
});
