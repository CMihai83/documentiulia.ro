import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  MultiCurrencyService,
  CurrencyCode,
  ConversionDirection,
} from './multi-currency.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Multi-Currency')
@Controller('currency')
export class MultiCurrencyController {
  constructor(private readonly currencyService: MultiCurrencyService) {}

  // =================== CURRENCY INFORMATION ===================

  @Get('list')
  @ApiOperation({ summary: 'Get all supported currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  getCurrencies() {
    return this.currencyService.getCurrencies();
  }

  @Get('info/:code')
  @ApiOperation({ summary: 'Get currency information' })
  @ApiResponse({ status: 200, description: 'Currency information' })
  getCurrency(@Param('code') code: CurrencyCode) {
    const currency = this.currencyService.getCurrency(code);
    if (!currency) {
      return { error: 'Currency not found' };
    }
    return currency;
  }

  @Get('major')
  @ApiOperation({ summary: 'Get major currencies' })
  @ApiResponse({ status: 200, description: 'Major currencies' })
  getMajorCurrencies() {
    return this.currencyService.getMajorCurrencies();
  }

  @Get('eu')
  @ApiOperation({ summary: 'Get EU currencies' })
  @ApiResponse({ status: 200, description: 'EU currencies' })
  getEUCurrencies() {
    return this.currencyService.getEUCurrencies();
  }

  @Get('region/:region')
  @ApiOperation({ summary: 'Get currencies by region' })
  @ApiResponse({ status: 200, description: 'Currencies by region' })
  getCurrenciesByRegion(@Param('region') region: 'EU' | 'Americas' | 'Asia' | 'EMEA' | 'Oceania') {
    return this.currencyService.getCurrenciesByRegion(region);
  }

  // =================== BNR (NATIONAL BANK OF ROMANIA) RATES ===================

  @Get('bnr/rates')
  @ApiOperation({ summary: 'Get all BNR exchange rates (official Romanian rates)' })
  @ApiResponse({ status: 200, description: 'BNR exchange rates' })
  getBNRRates() {
    return this.currencyService.getAllBNRRates();
  }

  @Get('bnr/rates/:currency')
  @ApiOperation({ summary: 'Get BNR rate for specific currency' })
  @ApiResponse({ status: 200, description: 'BNR rate for currency' })
  getBNRRate(@Param('currency') currency: CurrencyCode) {
    const rate = this.currencyService.getBNRRate(currency);
    if (!rate) {
      return { error: 'BNR rate not found for this currency' };
    }
    return rate;
  }

  @Get('bnr/official/:currency')
  @ApiOperation({ summary: 'Get official RON exchange rate (ANAF compliance)' })
  @ApiResponse({ status: 200, description: 'Official RON rate' })
  getOfficialRONRate(@Param('currency') currency: CurrencyCode) {
    const rate = this.currencyService.getOfficialRONRate(currency);
    if (!rate) {
      return { error: 'Official RON rate not found' };
    }
    return rate;
  }

  @Get('bnr/convert-to-ron')
  @ApiOperation({ summary: 'Convert amount to RON using official BNR rate' })
  @ApiResponse({ status: 200, description: 'RON conversion result' })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'currency', required: true })
  convertToRONOfficial(
    @Query('amount') amount: string,
    @Query('currency') currency: CurrencyCode,
  ) {
    const result = this.currencyService.convertToRONOfficial(parseFloat(amount), currency);
    if (!result) {
      return { error: 'Unable to convert - BNR rate not available' };
    }
    return result;
  }

  @Get('bnr/convert-from-ron')
  @ApiOperation({ summary: 'Convert RON to foreign currency using official BNR rate' })
  @ApiResponse({ status: 200, description: 'Foreign currency conversion result' })
  @ApiQuery({ name: 'ronAmount', required: true })
  @ApiQuery({ name: 'toCurrency', required: true })
  convertFromRONOfficial(
    @Query('ronAmount') ronAmount: string,
    @Query('toCurrency') toCurrency: CurrencyCode,
  ) {
    const result = this.currencyService.convertFromRONOfficial(parseFloat(ronAmount), toCurrency);
    if (!result) {
      return { error: 'Unable to convert - BNR rate not available' };
    }
    return result;
  }

  @Get('bnr/invoice-rate')
  @ApiOperation({ summary: 'Get rate for invoice conversion per Romanian fiscal regulations' })
  @ApiResponse({ status: 200, description: 'Invoice conversion rate' })
  @ApiQuery({ name: 'currency', required: true })
  @ApiQuery({ name: 'invoiceDate', required: true, description: 'Invoice date (ISO format)' })
  async getRateForInvoice(
    @Query('currency') currency: CurrencyCode,
    @Query('invoiceDate') invoiceDate: string,
  ) {
    return this.currencyService.getRateForInvoice(currency, new Date(invoiceDate));
  }

  @Post('bnr/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually refresh BNR rates (admin)' })
  @ApiResponse({ status: 200, description: 'BNR rates refreshed' })
  async refreshBNRRates() {
    await this.currencyService.fetchBNRRates();
    return { success: true, message: 'BNR rates refreshed' };
  }

  // =================== EXCHANGE RATES ===================

  @Get('rates')
  @ApiOperation({ summary: 'Get all exchange rates' })
  @ApiResponse({ status: 200, description: 'Exchange rates' })
  @ApiQuery({ name: 'base', required: false, description: 'Base currency (default: EUR)' })
  getAllExchangeRates(@Query('base') baseCurrency?: CurrencyCode) {
    return this.currencyService.getAllExchangeRates(baseCurrency || 'EUR');
  }

  @Get('rates/:base/:target')
  @ApiOperation({ summary: 'Get exchange rate for currency pair' })
  @ApiResponse({ status: 200, description: 'Exchange rate' })
  getExchangeRate(
    @Param('base') baseCurrency: CurrencyCode,
    @Param('target') targetCurrency: CurrencyCode,
  ) {
    const rate = this.currencyService.getExchangeRate(baseCurrency, targetCurrency);
    if (!rate) {
      return { error: 'Exchange rate not found' };
    }
    return rate;
  }

  @Put('rates/:base/:target')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update exchange rate (admin)' })
  @ApiResponse({ status: 200, description: 'Exchange rate updated' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rate: { type: 'number' },
        source: { type: 'string', enum: ['ecb', 'bnr', 'manual', 'api'] },
      },
    },
  })
  async updateExchangeRate(
    @Param('base') baseCurrency: CurrencyCode,
    @Param('target') targetCurrency: CurrencyCode,
    @Body('rate') rate: number,
    @Body('source') source?: 'ecb' | 'bnr' | 'manual' | 'api',
  ) {
    return this.currencyService.updateExchangeRate(baseCurrency, targetCurrency, rate, source);
  }

  @Get('rates/:base/:target/history')
  @ApiOperation({ summary: 'Get rate history' })
  @ApiResponse({ status: 200, description: 'Rate history' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  getRateHistory(
    @Param('base') baseCurrency: CurrencyCode,
    @Param('target') targetCurrency: CurrencyCode,
    @Query('days') days?: string,
  ) {
    return this.currencyService.getRateHistory(baseCurrency, targetCurrency, days ? parseInt(days) : 30);
  }

  // =================== CONVERSION ===================

  @Get('convert/quote')
  @ApiOperation({ summary: 'Get conversion quote' })
  @ApiResponse({ status: 200, description: 'Conversion quote' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'direction', required: false, enum: ['buy', 'sell', 'mid'] })
  getConversionQuote(
    @Query('from') fromCurrency: CurrencyCode,
    @Query('to') toCurrency: CurrencyCode,
    @Query('amount') amount: string,
    @Query('direction') direction?: ConversionDirection,
  ) {
    const quote = this.currencyService.getConversionQuote(
      fromCurrency,
      toCurrency,
      parseFloat(amount),
      direction,
    );
    if (!quote) {
      return { error: 'Unable to get quote' };
    }
    return quote;
  }

  @Post('convert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ status: 201, description: 'Currency converted' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fromCurrency: { type: 'string' },
        toCurrency: { type: 'string' },
        amount: { type: 'number' },
        direction: { type: 'string', enum: ['buy', 'sell', 'mid'] },
      },
    },
  })
  async convert(
    @Request() req: any,
    @Body('fromCurrency') fromCurrency: CurrencyCode,
    @Body('toCurrency') toCurrency: CurrencyCode,
    @Body('amount') amount: number,
    @Body('direction') direction?: ConversionDirection,
  ) {
    return this.currencyService.convert({
      fromCurrency,
      toCurrency,
      amount,
      direction,
      tenantId: req.user.tenantId,
    });
  }

  @Get('conversions/:conversionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversion details' })
  @ApiResponse({ status: 200, description: 'Conversion details' })
  getConversion(@Param('conversionId') conversionId: string) {
    const conversion = this.currencyService.getConversion(conversionId);
    if (!conversion) {
      return { error: 'Conversion not found' };
    }
    return conversion;
  }

  // =================== MULTI-CURRENCY PRICING ===================

  @Post('pricing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multi-currency price' })
  @ApiResponse({ status: 201, description: 'Multi-currency price created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        baseCurrency: { type: 'string' },
        baseAmount: { type: 'number' },
        currencies: { type: 'array', items: { type: 'string' } },
        autoUpdate: { type: 'boolean' },
        marginPercent: { type: 'number' },
        roundingRule: { type: 'string', enum: ['none', 'up', 'down', 'nearest', 'psychological'] },
      },
    },
  })
  async createMultiCurrencyPrice(
    @Body('productId') productId: string,
    @Body('baseCurrency') baseCurrency: CurrencyCode,
    @Body('baseAmount') baseAmount: number,
    @Body('currencies') currencies: CurrencyCode[],
    @Body('autoUpdate') autoUpdate?: boolean,
    @Body('marginPercent') marginPercent?: number,
    @Body('roundingRule') roundingRule?: 'none' | 'up' | 'down' | 'nearest' | 'psychological',
  ) {
    return this.currencyService.createMultiCurrencyPrice({
      productId,
      baseCurrency,
      baseAmount,
      currencies,
      autoUpdate,
      marginPercent,
      roundingRule,
    });
  }

  @Get('pricing/:priceId')
  @ApiOperation({ summary: 'Get multi-currency price' })
  @ApiResponse({ status: 200, description: 'Multi-currency price' })
  getMultiCurrencyPrice(@Param('priceId') priceId: string) {
    const price = this.currencyService.getMultiCurrencyPrice(priceId);
    if (!price) {
      return { error: 'Price not found' };
    }
    return price;
  }

  @Get('pricing/product/:productId')
  @ApiOperation({ summary: 'Get multi-currency price by product' })
  @ApiResponse({ status: 200, description: 'Multi-currency price' })
  getMultiCurrencyPriceByProduct(@Param('productId') productId: string) {
    const price = this.currencyService.getMultiCurrencyPriceByProduct(productId);
    if (!price) {
      return { error: 'Price not found' };
    }
    return price;
  }

  @Put('pricing/:priceId/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update multi-currency prices with current rates' })
  @ApiResponse({ status: 200, description: 'Prices updated' })
  async updateMultiCurrencyPrices(@Param('priceId') priceId: string) {
    return this.currencyService.updateMultiCurrencyPrices(priceId);
  }

  @Get('pricing/:priceId/currency/:currency')
  @ApiOperation({ summary: 'Get price in specific currency' })
  @ApiResponse({ status: 200, description: 'Price in currency' })
  getPriceInCurrency(
    @Param('priceId') priceId: string,
    @Param('currency') currency: CurrencyCode,
  ) {
    const price = this.currencyService.getPriceInCurrency(priceId, currency);
    if (price === null) {
      return { error: 'Price not available' };
    }
    return { currency, amount: price };
  }

  // =================== CURRENCY ACCOUNTS ===================

  @Post('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create currency account' })
  @ApiResponse({ status: 201, description: 'Currency account created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
      },
    },
  })
  async createCurrencyAccount(
    @Request() req: any,
    @Body('currency') currency: CurrencyCode,
  ) {
    return this.currencyService.createCurrencyAccount(req.user.tenantId, currency);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currency accounts' })
  @ApiResponse({ status: 200, description: 'Currency accounts' })
  getCurrencyAccounts(@Request() req: any) {
    return this.currencyService.getCurrencyAccountsByTenant(req.user.tenantId);
  }

  @Get('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currency account' })
  @ApiResponse({ status: 200, description: 'Currency account' })
  getCurrencyAccount(@Param('accountId') accountId: string) {
    const account = this.currencyService.getCurrencyAccount(accountId);
    if (!account) {
      return { error: 'Account not found' };
    }
    return account;
  }

  @Post('accounts/deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deposit to currency account' })
  @ApiResponse({ status: 201, description: 'Deposit successful' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
        amount: { type: 'number' },
        reference: { type: 'string' },
      },
    },
  })
  async deposit(
    @Request() req: any,
    @Body('currency') currency: CurrencyCode,
    @Body('amount') amount: number,
    @Body('reference') reference?: string,
  ) {
    return this.currencyService.deposit(req.user.tenantId, currency, amount, reference);
  }

  @Post('accounts/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw from currency account' })
  @ApiResponse({ status: 201, description: 'Withdrawal successful' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
        amount: { type: 'number' },
        reference: { type: 'string' },
      },
    },
  })
  async withdraw(
    @Request() req: any,
    @Body('currency') currency: CurrencyCode,
    @Body('amount') amount: number,
    @Body('reference') reference?: string,
  ) {
    return this.currencyService.withdraw(req.user.tenantId, currency, amount, reference);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currency transactions' })
  @ApiResponse({ status: 200, description: 'Transactions' })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTransactions(
    @Request() req: any,
    @Query('currency') currency?: CurrencyCode,
    @Query('type') type?: 'deposit' | 'withdrawal' | 'conversion' | 'transfer' | 'fee' | 'refund',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.currencyService.getTransactions(req.user.tenantId, {
      currency,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // =================== HEDGING ===================

  @Post('hedging')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create hedging position' })
  @ApiResponse({ status: 201, description: 'Hedging position created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        baseCurrency: { type: 'string' },
        targetCurrency: { type: 'string' },
        amount: { type: 'number' },
        strikeRate: { type: 'number' },
        type: { type: 'string', enum: ['forward', 'option', 'spot'] },
        direction: { type: 'string', enum: ['buy', 'sell'] },
        expiresAt: { type: 'string' },
      },
    },
  })
  async createHedgingPosition(
    @Request() req: any,
    @Body('baseCurrency') baseCurrency: CurrencyCode,
    @Body('targetCurrency') targetCurrency: CurrencyCode,
    @Body('amount') amount: number,
    @Body('strikeRate') strikeRate: number,
    @Body('type') type: 'forward' | 'option' | 'spot',
    @Body('direction') direction: 'buy' | 'sell',
    @Body('expiresAt') expiresAt: string,
  ) {
    return this.currencyService.createHedgingPosition({
      tenantId: req.user.tenantId,
      baseCurrency,
      targetCurrency,
      amount,
      strikeRate,
      type,
      direction,
      expiresAt: new Date(expiresAt),
    });
  }

  @Get('hedging')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hedging positions' })
  @ApiResponse({ status: 200, description: 'Hedging positions' })
  @ApiQuery({ name: 'status', required: false })
  getHedgingPositions(
    @Request() req: any,
    @Query('status') status?: 'active' | 'exercised' | 'expired' | 'cancelled',
  ) {
    return this.currencyService.getHedgingPositionsByTenant(req.user.tenantId, status);
  }

  @Get('hedging/:positionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hedging position' })
  @ApiResponse({ status: 200, description: 'Hedging position' })
  getHedgingPosition(@Param('positionId') positionId: string) {
    const position = this.currencyService.getHedgingPosition(positionId);
    if (!position) {
      return { error: 'Position not found' };
    }
    return position;
  }

  @Put('hedging/:positionId/pnl')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hedging position P&L' })
  @ApiResponse({ status: 200, description: 'P&L updated' })
  async updateHedgingPositionPnL(@Param('positionId') positionId: string) {
    return this.currencyService.updateHedgingPositionPnL(positionId);
  }

  // =================== ANALYTICS ===================

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currency analytics' })
  @ApiResponse({ status: 200, description: 'Currency analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getCurrencyAnalytics(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.currencyService.getCurrencyAnalytics(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // =================== UTILITY ===================

  @Get('format')
  @ApiOperation({ summary: 'Format amount in currency' })
  @ApiResponse({ status: 200, description: 'Formatted amount' })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'currency', required: true })
  formatAmount(
    @Query('amount') amount: string,
    @Query('currency') currency: CurrencyCode,
  ) {
    return {
      formatted: this.currencyService.formatAmount(parseFloat(amount), currency),
    };
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate currency code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateCurrency(@Param('code') code: string) {
    return {
      code,
      valid: this.currencyService.isValidCurrency(code),
    };
  }

  @Get('base')
  @ApiOperation({ summary: 'Get default base currency' })
  @ApiResponse({ status: 200, description: 'Base currency' })
  getDefaultBaseCurrency() {
    return {
      baseCurrency: this.currencyService.getDefaultBaseCurrency(),
    };
  }

  @Put('base')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set default base currency (admin)' })
  @ApiResponse({ status: 200, description: 'Base currency set' })
  setDefaultBaseCurrency(@Body('currency') currency: CurrencyCode) {
    this.currencyService.setDefaultBaseCurrency(currency);
    return { baseCurrency: currency };
  }
}
