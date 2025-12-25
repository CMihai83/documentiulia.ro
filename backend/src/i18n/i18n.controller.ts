/**
 * Internationalization (i18n) Controller
 * Sprint 42: Multi-Language API endpoints
 */

import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { I18nService, SupportedLocale, TranslationNamespace } from './i18n.service';

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('locales')
  @ApiOperation({ summary: 'Get all supported locales' })
  @ApiResponse({ status: 200, description: 'List of supported locales with configurations' })
  getSupportedLocales() {
    return this.i18nService.getSupportedLocales();
  }

  @Get('locales/:locale')
  @ApiOperation({ summary: 'Get configuration for a specific locale' })
  @ApiParam({ name: 'locale', description: 'Locale code (ro, en, de, fr, es, etc.)' })
  getLocaleConfig(@Param('locale') locale: SupportedLocale) {
    return this.i18nService.getLocaleConfig(locale);
  }

  @Get('translations')
  @ApiOperation({ summary: 'Get all translations for a locale' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale code (defaults to ro)' })
  getTranslations(@Query('locale') locale?: SupportedLocale) {
    return this.i18nService.getTranslations(locale || SupportedLocale.RO);
  }

  @Get('translations/:namespace')
  @ApiOperation({ summary: 'Get translations for a specific namespace' })
  @ApiParam({ name: 'namespace', description: 'Translation namespace (common, auth, finance, hr, etc.)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale code (defaults to ro)' })
  getNamespaceTranslations(
    @Param('namespace') namespace: TranslationNamespace,
    @Query('locale') locale?: SupportedLocale,
  ) {
    return this.i18nService.getNamespaceTranslations(namespace, locale || SupportedLocale.RO);
  }

  @Get('detect')
  @ApiOperation({ summary: 'Detect locale from Accept-Language header' })
  @ApiQuery({ name: 'acceptLanguage', required: true, description: 'Accept-Language header value' })
  detectLocale(@Query('acceptLanguage') acceptLanguage: string) {
    const detectedLocale = this.i18nService.detectLocale(acceptLanguage);
    return {
      detected: detectedLocale,
      config: this.i18nService.getLocaleConfig(detectedLocale),
    };
  }

  @Get('format/date')
  @ApiOperation({ summary: 'Format a date according to locale' })
  @ApiQuery({ name: 'date', required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale code' })
  @ApiQuery({ name: 'format', required: false, description: 'Format type: short, medium, long' })
  formatDate(
    @Query('date') dateStr: string,
    @Query('locale') locale?: SupportedLocale,
    @Query('format') format?: 'short' | 'medium' | 'long',
  ) {
    const date = new Date(dateStr);
    const targetLocale = locale || SupportedLocale.RO;

    return {
      formatted: this.i18nService.formatDate(date, targetLocale, format || 'medium'),
      relative: this.i18nService.formatRelativeTime(date, targetLocale),
      locale: targetLocale,
    };
  }

  @Get('format/currency')
  @ApiOperation({ summary: 'Format a currency value according to locale' })
  @ApiQuery({ name: 'value', required: true, description: 'Numeric value' })
  @ApiQuery({ name: 'currency', required: true, description: 'Currency code (RON, EUR, USD, etc.)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale code' })
  formatCurrency(
    @Query('value') value: string,
    @Query('currency') currency: string,
    @Query('locale') locale?: SupportedLocale,
  ) {
    const numValue = parseFloat(value);
    const targetLocale = locale || SupportedLocale.RO;

    return {
      formatted: this.i18nService.formatCurrency(numValue, currency, targetLocale),
      value: numValue,
      currency,
      locale: targetLocale,
    };
  }

  @Get('format/number')
  @ApiOperation({ summary: 'Format a number according to locale' })
  @ApiQuery({ name: 'value', required: true, description: 'Numeric value' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale code' })
  formatNumber(
    @Query('value') value: string,
    @Query('locale') locale?: SupportedLocale,
  ) {
    const numValue = parseFloat(value);
    const targetLocale = locale || SupportedLocale.RO;

    return {
      formatted: this.i18nService.formatNumber(numValue, targetLocale),
      value: numValue,
      locale: targetLocale,
    };
  }
}
