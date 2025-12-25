import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LocalizationService,
  SupportedLocale,
  TranslationCategory,
} from './localization.service';

describe('LocalizationService', () => {
  let service: LocalizationService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalizationService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LocalizationService>(LocalizationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default translations', () => {
      const translations = service.getAllTranslations();
      expect(translations.length).toBeGreaterThan(0);
    });

    it('should have Romanian as default locale', () => {
      expect(service.getDefaultLocale()).toBe('ro');
    });

    it('should have English as fallback locale', () => {
      expect(service.getFallbackLocale()).toBe('en');
    });

    it('should have all supported locales configured', () => {
      const locales = service.getSupportedLocales();
      expect(locales).toContain('ro');
      expect(locales).toContain('en');
      expect(locales).toContain('de');
      expect(locales).toContain('fr');
      expect(locales).toContain('es');
    });
  });

  describe('Translation', () => {
    it('should translate key to Romanian', () => {
      const text = service.translate('common.save', 'ro');
      expect(text).toBe('Salvează');
    });

    it('should translate key to English', () => {
      const text = service.translate('common.save', 'en');
      expect(text).toBe('Save');
    });

    it('should translate key to German', () => {
      const text = service.translate('common.save', 'de');
      expect(text).toBe('Speichern');
    });

    it('should translate key to French', () => {
      const text = service.translate('common.save', 'fr');
      expect(text).toBe('Sauvegarder');
    });

    it('should translate key to Spanish', () => {
      const text = service.translate('common.save', 'es');
      expect(text).toBe('Guardar');
    });

    it('should use shorthand t() method', () => {
      const text = service.t('common.cancel', 'ro');
      expect(text).toBe('Anulează');
    });

    it('should use default locale when not specified', () => {
      const text = service.translate('common.save');
      expect(text).toBe('Salvează');
    });

    it('should fallback to English for missing translation', () => {
      // Add a translation only in English
      service.addTranslation({
        key: 'test.englishOnly',
        category: 'COMMON',
        translations: { ro: '', en: 'English Only', de: '', fr: '', es: '' },
      });

      const text = service.translate('test.englishOnly', 'de');
      expect(text).toBe('English Only');
    });

    it('should return key when translation not found', () => {
      const text = service.translate('non.existent.key');
      expect(text).toBe('non.existent.key');
    });

    it('should interpolate parameters', () => {
      const text = service.translate('error.required', 'en', { field: 'Email' });
      expect(text).toBe('Email is required');
    });

    it('should interpolate parameters in Romanian', () => {
      const text = service.translate('error.required', 'ro', { field: 'Email' });
      expect(text).toBe('Câmpul Email este obligatoriu');
    });
  });

  describe('Invoice Translations', () => {
    it('should translate invoice.title', () => {
      expect(service.t('invoice.title', 'ro')).toBe('Factură');
      expect(service.t('invoice.title', 'en')).toBe('Invoice');
    });

    it('should translate invoice fields', () => {
      expect(service.t('invoice.number', 'ro')).toBe('Număr factură');
      expect(service.t('invoice.dueDate', 'ro')).toBe('Data scadentă');
      expect(service.t('invoice.seller', 'ro')).toBe('Furnizor');
      expect(service.t('invoice.buyer', 'ro')).toBe('Client');
    });
  });

  describe('Tax Translations', () => {
    it('should translate VAT terms', () => {
      expect(service.t('tax.vat', 'ro')).toBe('TVA');
      expect(service.t('tax.vatRate', 'ro')).toBe('Cota TVA');
    });

    it('should translate CUI/Tax ID', () => {
      expect(service.t('tax.cui', 'ro')).toBe('CUI/CIF');
      expect(service.t('tax.cui', 'en')).toBe('Tax ID');
    });
  });

  describe('ANAF Translations', () => {
    it('should translate ANAF terms', () => {
      expect(service.t('anaf.eFactura', 'ro')).toBe('e-Factura');
      expect(service.t('anaf.submission', 'ro')).toBe('Trimitere ANAF');
    });

    it('should translate SPV', () => {
      expect(service.t('anaf.spv', 'ro')).toBe('Spațiul Privat Virtual');
    });

    it('should translate D406 SAF-T', () => {
      expect(service.t('anaf.d406', 'ro')).toBe('Declarația D406 SAF-T');
    });
  });

  describe('Number Formatting', () => {
    it('should format number in Romanian style', () => {
      const formatted = service.formatNumber(1234567.89, 'ro');
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
    });

    it('should format number in English style', () => {
      const formatted = service.formatNumber(1234567.89, 'en');
      expect(formatted).toContain('1,234,567');
    });

    it('should respect fraction digits option', () => {
      const formatted = service.formatNumber(1234.5, 'en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(formatted).toBe('1,234.50');
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency in Romanian RON', () => {
      const formatted = service.formatCurrency(1000, 'ro');
      expect(formatted).toContain('1');
      expect(formatted).toContain('000');
      expect(formatted.toLowerCase()).toContain('ron');
    });

    it('should format currency in English USD', () => {
      const formatted = service.formatCurrency(1000, 'en');
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,000');
    });

    it('should format with custom currency', () => {
      const formatted = service.formatCurrency(1000, 'ro', 'EUR');
      expect(formatted).toContain('EUR');
    });
  });

  describe('Date Formatting', () => {
    const testDate = new Date('2025-01-15T10:30:00');

    it('should format date in Romanian', () => {
      const formatted = service.formatDate(testDate, 'ro');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format date in English', () => {
      const formatted = service.formatDate(testDate, 'en');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format date with different styles', () => {
      const short = service.formatDate(testDate, 'en', { style: 'short' });
      const long = service.formatDate(testDate, 'en', { style: 'long' });

      expect(short.length).toBeLessThan(long.length);
    });

    it('should format time', () => {
      const formatted = service.formatTime(testDate, 'en');
      expect(formatted).toBeDefined();
    });

    it('should format datetime', () => {
      const formatted = service.formatDateTime(testDate, 'en');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should accept date string', () => {
      const formatted = service.formatDate('2025-01-15', 'ro');
      expect(formatted).toContain('15');
    });

    it('should accept timestamp', () => {
      const formatted = service.formatDate(testDate.getTime(), 'ro');
      expect(formatted).toContain('15');
    });
  });

  describe('Relative Time Formatting', () => {
    it('should format past time', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const formatted = service.formatRelativeTime(pastDate, 'en');
      expect(formatted).toContain('hour');
    });

    it('should format future time', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day ahead
      const formatted = service.formatRelativeTime(futureDate, 'en');
      // Intl.RelativeTimeFormat may return "tomorrow" or "in 1 day"
      expect(formatted.toLowerCase()).toMatch(/tomorrow|day/);
    });

    it('should format in Romanian', () => {
      const pastDate = new Date(Date.now() - 3600000);
      const formatted = service.formatRelativeTime(pastDate, 'ro');
      expect(formatted).toBeDefined();
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentage', () => {
      const formatted = service.formatPercentage(50, 'en');
      expect(formatted).toBe('50%');
    });

    it('should format percentage with decimals', () => {
      const formatted = service.formatPercentage(33.33, 'en', 2);
      expect(formatted).toContain('33.33');
    });
  });

  describe('Locale Management', () => {
    it('should get locale config', () => {
      const config = service.getLocaleConfig('ro');

      expect(config).toBeDefined();
      expect(config!.name).toBe('Romanian');
      expect(config!.nativeName).toBe('Română');
    });

    it('should include currency info in config', () => {
      const config = service.getLocaleConfig('ro');

      expect(config!.currencyCode).toBe('RON');
      expect(config!.currencySymbol).toBe('lei');
    });

    it('should include date format in config', () => {
      const config = service.getLocaleConfig('ro');

      expect(config!.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should get all locales', () => {
      const locales = service.getAllLocales();

      expect(locales.length).toBe(5);
    });

    it('should set default locale', () => {
      service.setDefaultLocale('en');

      expect(service.getDefaultLocale()).toBe('en');
      expect(service.translate('common.save')).toBe('Save');
    });

    it('should emit event when default locale changes', () => {
      service.setDefaultLocale('de');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'locale.default.changed',
        expect.objectContaining({ locale: 'de' }),
      );
    });

    it('should throw error for unsupported locale', () => {
      expect(() => service.setDefaultLocale('xx' as SupportedLocale)).toThrow('Unsupported locale');
    });

    it('should set fallback locale', () => {
      service.setFallbackLocale('de');

      expect(service.getFallbackLocale()).toBe('de');
    });
  });

  describe('Locale Detection', () => {
    it('should detect Romanian from Accept-Language', () => {
      const locale = service.detectLocale('ro-RO,ro;q=0.9,en;q=0.8');
      expect(locale).toBe('ro');
    });

    it('should detect English from Accept-Language', () => {
      const locale = service.detectLocale('en-US,en;q=0.9');
      expect(locale).toBe('en');
    });

    it('should detect German from Accept-Language', () => {
      const locale = service.detectLocale('de-DE,de;q=0.9,en;q=0.8');
      expect(locale).toBe('de');
    });

    it('should return default for unsupported language', () => {
      const locale = service.detectLocale('ja-JP,ja;q=0.9');
      expect(locale).toBe('ro');
    });

    it('should return default when no Accept-Language', () => {
      const locale = service.detectLocale();
      expect(locale).toBe('ro');
    });

    it('should respect quality values', () => {
      const locale = service.detectLocale('de;q=0.5,en;q=0.9,ro;q=0.7');
      expect(locale).toBe('en');
    });
  });

  describe('Translation Management', () => {
    it('should add translation', () => {
      const translation = service.addTranslation({
        key: 'custom.new',
        category: 'COMMON',
        translations: { ro: 'Nou', en: 'New', de: 'Neu', fr: 'Nouveau', es: 'Nuevo' },
      });

      expect(translation.id).toBeDefined();
      expect(service.translate('custom.new', 'ro')).toBe('Nou');
    });

    it('should emit translation.added event', () => {
      service.addTranslation({
        key: 'custom.event',
        category: 'COMMON',
        translations: { ro: 'Test', en: 'Test', de: 'Test', fr: 'Test', es: 'Test' },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'translation.added',
        expect.objectContaining({ key: 'custom.event' }),
      );
    });

    it('should update translation', () => {
      service.addTranslation({
        key: 'custom.update',
        category: 'COMMON',
        translations: { ro: 'Original', en: 'Original', de: 'Original', fr: 'Original', es: 'Original' },
      });

      service.updateTranslation('custom.update', {
        translations: { ro: 'Actualizat', en: 'Updated', de: 'Aktualisiert', fr: 'Mis à jour', es: 'Actualizado' },
      });

      expect(service.translate('custom.update', 'ro')).toBe('Actualizat');
    });

    it('should emit translation.updated event', () => {
      service.addTranslation({
        key: 'custom.updateEvent',
        category: 'COMMON',
        translations: { ro: 'X', en: 'X', de: 'X', fr: 'X', es: 'X' },
      });

      service.updateTranslation('custom.updateEvent', {
        translations: { ro: 'Y', en: 'Y', de: 'Y', fr: 'Y', es: 'Y' },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'translation.updated',
        expect.objectContaining({ key: 'custom.updateEvent' }),
      );
    });

    it('should throw error when updating non-existent translation', () => {
      expect(() => service.updateTranslation('non.existent', {})).toThrow('Translation not found');
    });

    it('should delete translation', () => {
      service.addTranslation({
        key: 'custom.delete',
        category: 'COMMON',
        translations: { ro: 'Delete', en: 'Delete', de: 'Delete', fr: 'Delete', es: 'Delete' },
      });

      service.deleteTranslation('custom.delete');

      expect(service.getTranslation('custom.delete')).toBeUndefined();
    });

    it('should emit translation.deleted event', () => {
      service.addTranslation({
        key: 'custom.deleteEvent',
        category: 'COMMON',
        translations: { ro: 'X', en: 'X', de: 'X', fr: 'X', es: 'X' },
      });

      service.deleteTranslation('custom.deleteEvent');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'translation.deleted',
        expect.objectContaining({ key: 'custom.deleteEvent' }),
      );
    });

    it('should throw error when deleting non-existent translation', () => {
      expect(() => service.deleteTranslation('non.existent')).toThrow('Translation not found');
    });

    it('should get translations by category', () => {
      const invoiceTranslations = service.getTranslationsByCategory('INVOICE');

      expect(invoiceTranslations.length).toBeGreaterThan(0);
      expect(invoiceTranslations.every((t) => t.category === 'INVOICE')).toBe(true);
    });

    it('should get missing translations', () => {
      service.addTranslation({
        key: 'custom.partial',
        category: 'COMMON',
        translations: { ro: 'Test', en: '', de: '', fr: '', es: '' },
      });

      const missing = service.getMissingTranslations('en');

      expect(missing.find((t) => t.key === 'custom.partial')).toBeDefined();
    });
  });

  describe('Romanian Text Processing', () => {
    it('should normalize Romanian diacritics (old to new)', () => {
      const oldStyle = 'Ştefan Ţurcanu';
      const normalized = service.normalizeRomanianText(oldStyle);

      expect(normalized).toBe('Ștefan Țurcanu');
    });

    it('should handle already correct diacritics', () => {
      const correct = 'București';
      const normalized = service.normalizeRomanianText(correct);

      expect(normalized).toBe('București');
    });

    it('should remove Romanian diacritics', () => {
      const text = 'București și Țară';
      const removed = service.removeRomanianDiacritics(text);

      expect(removed).toBe('Bucuresti si Tara');
    });

    it('should handle all Romanian diacritics', () => {
      const text = 'ăĂâÂîÎșȘțȚ';
      const removed = service.removeRomanianDiacritics(text);

      expect(removed).toBe('aAaAiIsStT');
    });
  });

  describe('Statistics', () => {
    it('should get localization stats', () => {
      const stats = service.getStats();

      expect(stats.totalKeys).toBeGreaterThan(0);
    });

    it('should count translations by locale', () => {
      const stats = service.getStats();

      expect(stats.translatedByLocale.ro).toBeGreaterThan(0);
      expect(stats.translatedByLocale.en).toBeGreaterThan(0);
    });

    it('should calculate coverage by locale', () => {
      const stats = service.getStats();

      expect(stats.coverageByLocale.ro).toBeGreaterThan(0);
      expect(stats.coverageByLocale.en).toBeGreaterThan(0);
    });

    it('should count by category', () => {
      const stats = service.getStats();

      expect(stats.byCategory.COMMON).toBeGreaterThan(0);
      expect(stats.byCategory.INVOICE).toBeGreaterThan(0);
    });

    it('should return recently updated translations', () => {
      const stats = service.getStats();

      expect(stats.recentlyUpdated.length).toBeGreaterThan(0);
    });
  });
});
