import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExchangeRateService } from './exchange-rate.service';

@ApiTags('Exchange Rates')
@Controller('finance/exchange-rates')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * Get all current exchange rates
   */
  @Get()
  @ApiOperation({ summary: 'Get all current exchange rates' })
  @ApiResponse({ status: 200, description: 'Returns all exchange rates' })
  getAllRates() {
    const rates = this.exchangeRateService.getAllRates();
    const lastUpdate = this.exchangeRateService.getLastUpdate();

    return {
      rates,
      lastUpdate,
      baseCurrency: 'RON',
      source: 'BNR (Banca Nationala a Romaniei)',
    };
  }

  /**
   * Get exchange rate for a specific currency
   */
  @Get('rate')
  @ApiOperation({ summary: 'Get exchange rate for a specific currency' })
  @ApiQuery({ name: 'currency', required: true, description: 'Currency code (e.g., EUR, USD)' })
  @ApiResponse({ status: 200, description: 'Returns exchange rate' })
  getRate(@Query('currency') currency: string) {
    const rate = this.exchangeRateService.getRate(currency);

    if (!rate) {
      return {
        error: true,
        message: `Moneda ${currency} nu este suportata`,
      };
    }

    return {
      currency: rate.currency,
      name: rate.name,
      rate: rate.rate,
      multiplier: rate.multiplier,
      date: rate.date,
      baseCurrency: 'RON',
    };
  }

  /**
   * Convert amount between currencies
   */
  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiQuery({ name: 'from', required: true, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, description: 'Target currency code' })
  @ApiResponse({ status: 200, description: 'Returns converted amount' })
  convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
      return {
        error: true,
        message: 'Suma invalida',
      };
    }

    const conversion = this.exchangeRateService.convert(numAmount, from, to);

    return {
      ...conversion,
      formattedFrom: this.exchangeRateService.formatAmount(conversion.fromAmount, from),
      formattedTo: this.exchangeRateService.formatAmount(conversion.toAmount, to),
    };
  }

  /**
   * Get historical rates for a currency
   */
  @Get('historical')
  @ApiOperation({ summary: 'Get historical exchange rates' })
  @ApiQuery({ name: 'currency', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default 30)' })
  @ApiResponse({ status: 200, description: 'Returns historical rates' })
  getHistoricalRates(
    @Query('currency') currency: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days) : 30;
    const rates = this.exchangeRateService.getHistoricalRates(currency, numDays);

    return {
      currency: currency.toUpperCase(),
      days: numDays,
      rates,
      chartData: {
        labels: rates.map(r => new Date(r.date).toLocaleDateString('ro-RO')),
        values: rates.map(r => r.rate),
      },
    };
  }

  /**
   * Get supported currencies
   */
  @Get('currencies')
  @ApiOperation({ summary: 'Get list of supported currencies' })
  @ApiResponse({ status: 200, description: 'Returns supported currencies' })
  getSupportedCurrencies() {
    return {
      currencies: this.exchangeRateService.getSupportedCurrencies(),
      baseCurrency: { code: 'RON', name: 'Leu romanesc' },
    };
  }

  /**
   * Get exchange rate summary for dashboard
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get exchange rate summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Returns summary with main rates and trends' })
  getSummary() {
    return this.exchangeRateService.getSummary();
  }

  /**
   * Manually trigger rate refresh (admin only)
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually refresh exchange rates from BNR' })
  @ApiResponse({ status: 200, description: 'Rates refreshed' })
  async refreshRates() {
    await this.exchangeRateService.fetchBNRRates();

    return {
      success: true,
      message: 'Cursurile de schimb au fost actualizate',
      lastUpdate: this.exchangeRateService.getLastUpdate(),
    };
  }
}
