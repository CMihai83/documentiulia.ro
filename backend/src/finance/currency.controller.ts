import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrencyService, ConversionResult, Currency, ExchangeRate } from './currency.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

// =================== DTOs ===================

export class ConvertCurrencyDto {
  amount: number;
  from: string;
  to: string;
}

export class ConvertToMultipleDto {
  amount: number;
  from: string;
  toCurrencies: string[];
}

export class CalculateMultiCurrencyTotalDto {
  items: Array<{ amount: number; currency: string }>;
  targetCurrency: string;
}

// =================== CONTROLLER ===================

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  // =================== PUBLIC ENDPOINTS ===================

  @Get('supported')
  @ApiOperation({ summary: 'Get all supported currencies' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of supported currencies' })
  getSupportedCurrencies(): Currency[] {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('info')
  @ApiOperation({ summary: 'Get currency information by code' })
  @ApiQuery({ name: 'code', required: true, description: 'Currency code (e.g., EUR, RON, USD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency information' })
  getCurrencyInfo(@Query('code') code: string): Currency | null {
    return this.currencyService.getCurrency(code);
  }

  @Get('by-country')
  @ApiOperation({ summary: 'Get currency by country code' })
  @ApiQuery({ name: 'country', required: true, description: 'Country code (e.g., RO, DE, US)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Currency for country' })
  getCurrencyByCountry(@Query('country') country: string): Currency | null {
    return this.currencyService.getCurrencyByCountry(country);
  }

  // =================== EXCHANGE RATES ===================

  @Get('rates')
  @ApiOperation({ summary: 'Get all current exchange rates (EUR base)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All exchange rates' })
  async getAllRates(): Promise<Record<string, ExchangeRate>> {
    return this.currencyService.getAllRates();
  }

  @Get('rate')
  @ApiOperation({ summary: 'Get exchange rate between two currencies' })
  @ApiQuery({ name: 'from', required: true, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, description: 'Target currency code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Exchange rate' })
  async getExchangeRate(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<ExchangeRate> {
    return this.currencyService.getExchangeRate(from, to);
  }

  @Get('rates/base')
  @ApiOperation({ summary: 'Get all rates for a specific base currency' })
  @ApiQuery({ name: 'base', required: true, description: 'Base currency code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rates for base currency' })
  async getRatesForBase(
    @Query('base') base: string,
  ): Promise<Record<string, number>> {
    return this.currencyService.getRatesForBase(base);
  }

  @Get('rates/history')
  @ApiOperation({ summary: 'Get historical exchange rates' })
  @ApiQuery({ name: 'from', required: true, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, description: 'Target currency code' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historical rates' })
  async getHistoricalRates(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('days') days?: string,
  ) {
    return this.currencyService.getHistoricalRates(
      from,
      to,
      days ? parseInt(days, 10) : 30,
    );
  }

  // =================== CONVERSION ===================

  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiQuery({ name: 'amount', required: true, description: 'Amount to convert' })
  @ApiQuery({ name: 'from', required: true, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, description: 'Target currency code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conversion result' })
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<ConversionResult> {
    return this.currencyService.convert(parseFloat(amount), from, to);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert amount between currencies (POST)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conversion result' })
  async convertPost(@Body() dto: ConvertCurrencyDto): Promise<ConversionResult> {
    return this.currencyService.convert(dto.amount, dto.from, dto.to);
  }

  @Post('convert/multiple')
  @ApiOperation({ summary: 'Convert amount to multiple currencies' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Multiple conversion results' })
  async convertToMultiple(
    @Body() dto: ConvertToMultipleDto,
  ): Promise<ConversionResult[]> {
    return this.currencyService.convertToMultiple(
      dto.amount,
      dto.from,
      dto.toCurrencies,
    );
  }

  @Get('equivalents')
  @ApiOperation({ summary: 'Get equivalent amounts in all currencies' })
  @ApiQuery({ name: 'amount', required: true, description: 'Amount' })
  @ApiQuery({ name: 'currency', required: true, description: 'Base currency code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Equivalent amounts' })
  async getEquivalents(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ): Promise<Record<string, number>> {
    return this.currencyService.getEquivalentAmounts(parseFloat(amount), currency);
  }

  // =================== FORMATTING ===================

  @Get('format')
  @ApiOperation({ summary: 'Format amount with currency' })
  @ApiQuery({ name: 'amount', required: true, description: 'Amount to format' })
  @ApiQuery({ name: 'currency', required: true, description: 'Currency code' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale (e.g., en-US, ro-RO)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Formatted amount' })
  formatCurrency(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
    @Query('locale') locale?: string,
  ): { formatted: string } {
    return {
      formatted: this.currencyService.formatCurrency(
        parseFloat(amount),
        currency,
        { locale: locale || 'en-US' },
      ),
    };
  }

  // =================== PROTECTED ENDPOINTS ===================

  @Post('calculate-total')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate multi-currency invoice total' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Total calculation result' })
  async calculateMultiCurrencyTotal(
    @Body() dto: CalculateMultiCurrencyTotalDto,
  ) {
    return this.currencyService.calculateMultiCurrencyTotal(
      dto.items,
      dto.targetCurrency,
    );
  }

  @Get('cache/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get exchange rate cache status (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cache status' })
  getCacheStatus() {
    return this.currencyService.getCacheStatus();
  }

  @Post('cache/refresh')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Force refresh exchange rates (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refresh result' })
  async forceRefreshRates() {
    return this.currencyService.forceRefresh();
  }
}
