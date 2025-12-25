import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { LocalizationService, SupportedLocale, TranslationCategory } from './localization.service';

@ApiTags('Localization')
@Controller('localization')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  // =================== TRANSLATIONS ===================

  @Get('translations')
  @ApiOperation({ summary: 'Get all translations' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'List of translations' })
  getTranslations(
    @Query('category') category?: TranslationCategory,
    @Query('search') search?: string,
  ) {
    let translations = category
      ? this.localizationService.getTranslationsByCategory(category)
      : this.localizationService.getAllTranslations();

    if (search) {
      const searchLower = search.toLowerCase();
      translations = translations.filter(
        (t) =>
          t.key.toLowerCase().includes(searchLower) ||
          Object.values(t.translations).some((v) =>
            v?.toLowerCase().includes(searchLower),
          ),
      );
    }

    return translations;
  }

  @Get('translations/:key')
  @ApiOperation({ summary: 'Get translation by key' })
  @ApiResponse({ status: 200, description: 'Translation details' })
  getTranslation(@Param('key') key: string) {
    const translation = this.localizationService.getTranslation(key);
    return translation || { error: 'Translation not found' };
  }

  @Get('translate')
  @ApiOperation({ summary: 'Translate a key to specific locale' })
  @ApiQuery({ name: 'key', required: true })
  @ApiQuery({ name: 'locale', required: true })
  @ApiQuery({ name: 'params', required: false })
  @ApiResponse({ status: 200, description: 'Translated text' })
  translate(
    @Query('key') key: string,
    @Query('locale') locale: SupportedLocale,
    @Query('params') params?: string,
  ) {
    const parsedParams = params ? JSON.parse(params) : undefined;
    const text = this.localizationService.translate(key, locale, parsedParams);
    return { key, locale, text };
  }

  @Post('translations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create translation' })
  @ApiResponse({ status: 201, description: 'Translation created' })
  createTranslation(
    @Body() body: {
      key: string;
      category: TranslationCategory;
      description?: string;
      translations: Record<SupportedLocale, string>;
      placeholders?: string[];
      context?: string;
    },
  ) {
    return this.localizationService.addTranslation(body);
  }

  @Put('translations/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update translation' })
  @ApiResponse({ status: 200, description: 'Translation updated' })
  updateTranslation(
    @Param('key') key: string,
    @Body() updates: {
      translations?: Partial<Record<SupportedLocale, string>>;
      description?: string;
      context?: string;
    },
  ) {
    return this.localizationService.updateTranslation(key, updates as any);
  }

  @Delete('translations/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete translation' })
  @ApiResponse({ status: 200, description: 'Translation deleted' })
  deleteTranslation(@Param('key') key: string) {
    this.localizationService.deleteTranslation(key);
    return { success: true };
  }

  // =================== LOCALE BUNDLES ===================

  @Get('bundle/:locale')
  @ApiOperation({ summary: 'Get translation bundle for locale' })
  @ApiQuery({ name: 'categories', required: false })
  @ApiResponse({ status: 200, description: 'Translation bundle' })
  getBundle(
    @Param('locale') locale: SupportedLocale,
    @Query('categories') categories?: string,
  ) {
    let translations = this.localizationService.getAllTranslations();

    if (categories) {
      const categoryList = categories.split(',') as TranslationCategory[];
      translations = translations.filter((t) => categoryList.includes(t.category));
    }

    // Build key-value bundle for the specific locale
    const bundle: Record<string, string> = {};
    for (const translation of translations) {
      bundle[translation.key] = translation.translations[locale] || translation.key;
    }

    return { locale, bundle };
  }

  @Get('bundle/:locale/category/:category')
  @ApiOperation({ summary: 'Get translations for specific category' })
  @ApiResponse({ status: 200, description: 'Category translations' })
  getCategoryBundle(
    @Param('locale') locale: SupportedLocale,
    @Param('category') category: TranslationCategory,
  ) {
    const translations = this.localizationService.getTranslationsByCategory(category);

    // Build key-value bundle for the specific locale
    const bundle: Record<string, string> = {};
    for (const translation of translations) {
      bundle[translation.key] = translation.translations[locale] || translation.key;
    }

    return { locale, category, bundle };
  }

  // =================== FORMATTING ===================

  @Get('format/date')
  @ApiOperation({ summary: 'Format date for locale' })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'locale', required: true })
  @ApiQuery({ name: 'style', required: false })
  @ApiResponse({ status: 200, description: 'Formatted date' })
  formatDate(
    @Query('date') date: string,
    @Query('locale') locale: SupportedLocale,
    @Query('style') style?: 'short' | 'medium' | 'long' | 'full',
  ) {
    const formatted = this.localizationService.formatDate(new Date(date), locale, { style });
    return { date, locale, style, formatted };
  }

  @Get('format/number')
  @ApiOperation({ summary: 'Format number for locale' })
  @ApiQuery({ name: 'value', required: true })
  @ApiQuery({ name: 'locale', required: true })
  @ApiResponse({ status: 200, description: 'Formatted number' })
  formatNumber(
    @Query('value') value: string,
    @Query('locale') locale: SupportedLocale,
  ) {
    const formatted = this.localizationService.formatNumber(parseFloat(value), locale);
    return { value, locale, formatted };
  }

  @Get('format/currency')
  @ApiOperation({ summary: 'Format currency for locale' })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'locale', required: true })
  @ApiQuery({ name: 'currency', required: false })
  @ApiResponse({ status: 200, description: 'Formatted currency' })
  formatCurrency(
    @Query('amount') amount: string,
    @Query('locale') locale: SupportedLocale,
    @Query('currency') currency?: string,
  ) {
    const formatted = this.localizationService.formatCurrency(parseFloat(amount), locale, currency);
    return { amount, locale, currency, formatted };
  }

  // =================== LOCALES CONFIGURATION ===================

  @Get('locales')
  @ApiOperation({ summary: 'Get supported locales' })
  @ApiResponse({ status: 200, description: 'List of supported locales' })
  getLocales() {
    return this.localizationService.getAllLocales();
  }

  @Get('locales/:locale')
  @ApiOperation({ summary: 'Get locale configuration' })
  @ApiResponse({ status: 200, description: 'Locale configuration' })
  getLocaleConfig(@Param('locale') locale: SupportedLocale) {
    const config = this.localizationService.getLocaleConfig(locale);
    return config || { error: 'Locale not found' };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get translation categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  getCategories() {
    return [
      { value: 'COMMON', label: 'Common', labelRo: 'Comun' },
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'TAX', label: 'Tax', labelRo: 'Taxe' },
      { value: 'HR', label: 'HR', labelRo: 'Resurse Umane' },
      { value: 'ANAF', label: 'ANAF', labelRo: 'ANAF' },
      { value: 'SAGA', label: 'SAGA', labelRo: 'SAGA' },
      { value: 'FINANCE', label: 'Finance', labelRo: 'Finanțe' },
      { value: 'OPERATIONS', label: 'Operations', labelRo: 'Operațiuni' },
      { value: 'ERROR', label: 'Error', labelRo: 'Eroare' },
      { value: 'VALIDATION', label: 'Validation', labelRo: 'Validare' },
      { value: 'UI', label: 'UI', labelRo: 'Interfață' },
      { value: 'EMAIL', label: 'Email', labelRo: 'Email' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
    ];
  }

  // =================== STATISTICS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get localization statistics' })
  @ApiResponse({ status: 200, description: 'Localization statistics' })
  getStats() {
    return this.localizationService.getStats();
  }

  // =================== MISSING TRANSLATIONS ===================

  @Get('missing')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get missing translations' })
  @ApiQuery({ name: 'locale', required: true })
  @ApiResponse({ status: 200, description: 'Missing translations' })
  getMissingTranslations(@Query('locale') locale: SupportedLocale) {
    return this.localizationService.getMissingTranslations(locale);
  }
}
