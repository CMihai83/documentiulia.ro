import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type SupportedLocale = 'ro' | 'en' | 'de' | 'fr' | 'es';

export type TranslationCategory =
  | 'COMMON'
  | 'INVOICE'
  | 'TAX'
  | 'HR'
  | 'ANAF'
  | 'SAGA'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'ERROR'
  | 'VALIDATION'
  | 'UI'
  | 'EMAIL'
  | 'REPORT';

export interface TranslationKey {
  id: string;
  key: string;
  category: TranslationCategory;
  description?: string;
  translations: Record<SupportedLocale, string>;
  placeholders?: string[];
  context?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocaleConfig {
  locale: SupportedLocale;
  name: string;
  nativeName: string;
  dateFormat: string;
  timeFormat: string;
  dateTimeFormat: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  decimalSeparator: string;
  thousandsSeparator: string;
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  direction: 'ltr' | 'rtl';
}

export interface FormatOptions {
  locale?: SupportedLocale;
  style?: 'short' | 'medium' | 'long' | 'full';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface PluralRules {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface LocalizationStats {
  totalKeys: number;
  translatedByLocale: Record<SupportedLocale, number>;
  missingByLocale: Record<SupportedLocale, number>;
  coverageByLocale: Record<SupportedLocale, number>;
  byCategory: Record<TranslationCategory, number>;
  recentlyUpdated: TranslationKey[];
}

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);
  private translations: Map<string, TranslationKey> = new Map();
  private localeConfigs: Map<SupportedLocale, LocaleConfig> = new Map();
  private defaultLocale: SupportedLocale = 'ro';
  private fallbackLocale: SupportedLocale = 'en';

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeLocaleConfigs();
    this.initializeDefaultTranslations();
  }

  private initializeLocaleConfigs(): void {
    const configs: LocaleConfig[] = [
      {
        locale: 'ro',
        name: 'Romanian',
        nativeName: 'Română',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        currencyCode: 'RON',
        currencySymbol: 'lei',
        currencyPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        firstDayOfWeek: 1,
        direction: 'ltr',
      },
      {
        locale: 'en',
        name: 'English',
        nativeName: 'English',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'hh:mm A',
        dateTimeFormat: 'MM/DD/YYYY hh:mm A',
        currencyCode: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        decimalSeparator: '.',
        thousandsSeparator: ',',
        firstDayOfWeek: 0,
        direction: 'ltr',
      },
      {
        locale: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        firstDayOfWeek: 1,
        direction: 'ltr',
      },
      {
        locale: 'fr',
        name: 'French',
        nativeName: 'Français',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD/MM/YYYY HH:mm',
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: ' ',
        firstDayOfWeek: 1,
        direction: 'ltr',
      },
      {
        locale: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD/MM/YYYY HH:mm',
        currencyCode: 'EUR',
        currencySymbol: '€',
        currencyPosition: 'after',
        decimalSeparator: ',',
        thousandsSeparator: '.',
        firstDayOfWeek: 1,
        direction: 'ltr',
      },
    ];

    configs.forEach((config) => {
      this.localeConfigs.set(config.locale, config);
    });
  }

  private initializeDefaultTranslations(): void {
    const defaultTranslations: Omit<TranslationKey, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // Common
      {
        key: 'common.save',
        category: 'COMMON',
        translations: { ro: 'Salvează', en: 'Save', de: 'Speichern', fr: 'Sauvegarder', es: 'Guardar' },
      },
      {
        key: 'common.cancel',
        category: 'COMMON',
        translations: { ro: 'Anulează', en: 'Cancel', de: 'Abbrechen', fr: 'Annuler', es: 'Cancelar' },
      },
      {
        key: 'common.delete',
        category: 'COMMON',
        translations: { ro: 'Șterge', en: 'Delete', de: 'Löschen', fr: 'Supprimer', es: 'Eliminar' },
      },
      {
        key: 'common.edit',
        category: 'COMMON',
        translations: { ro: 'Editează', en: 'Edit', de: 'Bearbeiten', fr: 'Modifier', es: 'Editar' },
      },
      {
        key: 'common.search',
        category: 'COMMON',
        translations: { ro: 'Caută', en: 'Search', de: 'Suchen', fr: 'Rechercher', es: 'Buscar' },
      },
      {
        key: 'common.confirm',
        category: 'COMMON',
        translations: { ro: 'Confirmă', en: 'Confirm', de: 'Bestätigen', fr: 'Confirmer', es: 'Confirmar' },
      },
      {
        key: 'common.loading',
        category: 'COMMON',
        translations: { ro: 'Se încarcă...', en: 'Loading...', de: 'Lädt...', fr: 'Chargement...', es: 'Cargando...' },
      },
      {
        key: 'common.success',
        category: 'COMMON',
        translations: { ro: 'Succes', en: 'Success', de: 'Erfolg', fr: 'Succès', es: 'Éxito' },
      },
      {
        key: 'common.error',
        category: 'COMMON',
        translations: { ro: 'Eroare', en: 'Error', de: 'Fehler', fr: 'Erreur', es: 'Error' },
      },
      {
        key: 'common.warning',
        category: 'COMMON',
        translations: { ro: 'Atenție', en: 'Warning', de: 'Warnung', fr: 'Avertissement', es: 'Advertencia' },
      },

      // Invoice
      {
        key: 'invoice.title',
        category: 'INVOICE',
        translations: { ro: 'Factură', en: 'Invoice', de: 'Rechnung', fr: 'Facture', es: 'Factura' },
      },
      {
        key: 'invoice.number',
        category: 'INVOICE',
        translations: { ro: 'Număr factură', en: 'Invoice number', de: 'Rechnungsnummer', fr: 'Numéro de facture', es: 'Número de factura' },
      },
      {
        key: 'invoice.date',
        category: 'INVOICE',
        translations: { ro: 'Data emiterii', en: 'Issue date', de: 'Ausstellungsdatum', fr: 'Date d\'émission', es: 'Fecha de emisión' },
      },
      {
        key: 'invoice.dueDate',
        category: 'INVOICE',
        translations: { ro: 'Data scadentă', en: 'Due date', de: 'Fälligkeitsdatum', fr: 'Date d\'échéance', es: 'Fecha de vencimiento' },
      },
      {
        key: 'invoice.subtotal',
        category: 'INVOICE',
        translations: { ro: 'Subtotal', en: 'Subtotal', de: 'Zwischensumme', fr: 'Sous-total', es: 'Subtotal' },
      },
      {
        key: 'invoice.total',
        category: 'INVOICE',
        translations: { ro: 'Total', en: 'Total', de: 'Gesamt', fr: 'Total', es: 'Total' },
      },
      {
        key: 'invoice.seller',
        category: 'INVOICE',
        translations: { ro: 'Furnizor', en: 'Seller', de: 'Verkäufer', fr: 'Vendeur', es: 'Vendedor' },
      },
      {
        key: 'invoice.buyer',
        category: 'INVOICE',
        translations: { ro: 'Client', en: 'Buyer', de: 'Käufer', fr: 'Acheteur', es: 'Comprador' },
      },

      // Tax
      {
        key: 'tax.vat',
        category: 'TAX',
        translations: { ro: 'TVA', en: 'VAT', de: 'MwSt', fr: 'TVA', es: 'IVA' },
      },
      {
        key: 'tax.vatRate',
        category: 'TAX',
        translations: { ro: 'Cota TVA', en: 'VAT rate', de: 'MwSt-Satz', fr: 'Taux de TVA', es: 'Tipo de IVA' },
      },
      {
        key: 'tax.cui',
        category: 'TAX',
        translations: { ro: 'CUI/CIF', en: 'Tax ID', de: 'Steuernummer', fr: 'Numéro fiscal', es: 'NIF' },
      },
      {
        key: 'tax.reverseCharge',
        category: 'TAX',
        translations: { ro: 'Taxare inversă', en: 'Reverse charge', de: 'Umkehrung der Steuerschuldnerschaft', fr: 'Autoliquidation', es: 'Inversión del sujeto pasivo' },
      },

      // ANAF
      {
        key: 'anaf.eFactura',
        category: 'ANAF',
        translations: { ro: 'e-Factura', en: 'e-Invoice', de: 'E-Rechnung', fr: 'Facture électronique', es: 'Factura electrónica' },
      },
      {
        key: 'anaf.submission',
        category: 'ANAF',
        translations: { ro: 'Trimitere ANAF', en: 'ANAF submission', de: 'ANAF-Übermittlung', fr: 'Soumission ANAF', es: 'Envío ANAF' },
      },
      {
        key: 'anaf.spv',
        category: 'ANAF',
        translations: { ro: 'Spațiul Privat Virtual', en: 'Virtual Private Space', de: 'Virtueller privater Raum', fr: 'Espace Privé Virtuel', es: 'Espacio Privado Virtual' },
      },
      {
        key: 'anaf.d406',
        category: 'ANAF',
        translations: { ro: 'Declarația D406 SAF-T', en: 'D406 SAF-T Declaration', de: 'D406 SAF-T Erklärung', fr: 'Déclaration D406 SAF-T', es: 'Declaración D406 SAF-T' },
      },

      // SAGA
      {
        key: 'saga.sync',
        category: 'SAGA',
        translations: { ro: 'Sincronizare SAGA', en: 'SAGA sync', de: 'SAGA-Synchronisierung', fr: 'Synchronisation SAGA', es: 'Sincronización SAGA' },
      },
      {
        key: 'saga.export',
        category: 'SAGA',
        translations: { ro: 'Export SAGA', en: 'SAGA export', de: 'SAGA-Export', fr: 'Export SAGA', es: 'Exportación SAGA' },
      },

      // HR
      {
        key: 'hr.employee',
        category: 'HR',
        translations: { ro: 'Angajat', en: 'Employee', de: 'Mitarbeiter', fr: 'Employé', es: 'Empleado' },
      },
      {
        key: 'hr.contract',
        category: 'HR',
        translations: { ro: 'Contract de muncă', en: 'Employment contract', de: 'Arbeitsvertrag', fr: 'Contrat de travail', es: 'Contrato de trabajo' },
      },
      {
        key: 'hr.salary',
        category: 'HR',
        translations: { ro: 'Salariu', en: 'Salary', de: 'Gehalt', fr: 'Salaire', es: 'Salario' },
      },
      {
        key: 'hr.payroll',
        category: 'HR',
        translations: { ro: 'Salarizare', en: 'Payroll', de: 'Gehaltsabrechnung', fr: 'Paie', es: 'Nómina' },
      },

      // Errors
      {
        key: 'error.required',
        category: 'ERROR',
        placeholders: ['field'],
        translations: {
          ro: 'Câmpul {{field}} este obligatoriu',
          en: '{{field}} is required',
          de: '{{field}} ist erforderlich',
          fr: '{{field}} est requis',
          es: '{{field}} es obligatorio',
        },
      },
      {
        key: 'error.invalid',
        category: 'ERROR',
        placeholders: ['field'],
        translations: {
          ro: 'Câmpul {{field}} este invalid',
          en: '{{field}} is invalid',
          de: '{{field}} ist ungültig',
          fr: '{{field}} est invalide',
          es: '{{field}} no es válido',
        },
      },
      {
        key: 'error.notFound',
        category: 'ERROR',
        placeholders: ['item'],
        translations: {
          ro: '{{item}} nu a fost găsit',
          en: '{{item}} not found',
          de: '{{item}} nicht gefunden',
          fr: '{{item}} non trouvé',
          es: '{{item}} no encontrado',
        },
      },

      // Validation
      {
        key: 'validation.cuiInvalid',
        category: 'VALIDATION',
        translations: {
          ro: 'CUI/CIF invalid',
          en: 'Invalid Tax ID',
          de: 'Ungültige Steuernummer',
          fr: 'Numéro fiscal invalide',
          es: 'NIF inválido',
        },
      },
      {
        key: 'validation.ibanInvalid',
        category: 'VALIDATION',
        translations: {
          ro: 'IBAN invalid',
          en: 'Invalid IBAN',
          de: 'Ungültige IBAN',
          fr: 'IBAN invalide',
          es: 'IBAN inválido',
        },
      },
    ];

    const now = new Date();
    defaultTranslations.forEach((trans) => {
      const id = this.generateId('trans');
      this.translations.set(trans.key, { ...trans, id, createdAt: now, updatedAt: now });
    });
  }

  // Translation Methods

  translate(key: string, locale?: SupportedLocale, params?: Record<string, any>): string {
    const targetLocale = locale || this.defaultLocale;
    const translation = this.translations.get(key);

    if (!translation) {
      this.logger.warn(`Translation not found: ${key}`);
      return key;
    }

    let text = translation.translations[targetLocale];
    if (!text) {
      // Try fallback
      text = translation.translations[this.fallbackLocale];
      if (!text) {
        return key;
      }
    }

    // Replace placeholders
    if (params) {
      text = this.interpolate(text, params);
    }

    return text;
  }

  t(key: string, locale?: SupportedLocale, params?: Record<string, any>): string {
    return this.translate(key, locale, params);
  }

  translatePlural(
    key: string,
    count: number,
    locale?: SupportedLocale,
    params?: Record<string, any>,
  ): string {
    const targetLocale = locale || this.defaultLocale;
    const translation = this.translations.get(key);

    if (!translation) {
      return key;
    }

    const pluralForm = this.getPluralForm(count, targetLocale);
    const pluralKey = `${key}.${pluralForm}`;
    const pluralTranslation = this.translations.get(pluralKey);

    if (pluralTranslation) {
      let text = pluralTranslation.translations[targetLocale] || pluralTranslation.translations[this.fallbackLocale];
      if (text && params) {
        text = this.interpolate(text, { ...params, count });
      }
      return text || key;
    }

    // Fallback to base translation
    return this.translate(key, locale, { ...params, count });
  }

  private getPluralForm(count: number, locale: SupportedLocale): string {
    // Romanian plural rules
    if (locale === 'ro') {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count >= 2 && count <= 19) return 'few';
      return 'other';
    }

    // Default plural rules (English-like)
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  }

  private interpolate(text: string, params: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  // Formatting Methods

  formatNumber(value: number, locale?: SupportedLocale, options?: FormatOptions): string {
    const targetLocale = locale || this.defaultLocale;
    const config = this.localeConfigs.get(targetLocale)!;

    const formatter = new Intl.NumberFormat(this.getIntlLocale(targetLocale), {
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    return formatter.format(value);
  }

  formatCurrency(
    value: number,
    locale?: SupportedLocale,
    currency?: string,
    options?: FormatOptions,
  ): string {
    const targetLocale = locale || this.defaultLocale;
    const config = this.localeConfigs.get(targetLocale)!;
    const currencyCode = currency || config.currencyCode;

    const formatter = new Intl.NumberFormat(this.getIntlLocale(targetLocale), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    return formatter.format(value);
  }

  formatDate(date: Date | string | number, locale?: SupportedLocale, options?: FormatOptions): string {
    const targetLocale = locale || this.defaultLocale;
    const dateObj = date instanceof Date ? date : new Date(date);

    const styleMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' },
    };

    const formatter = new Intl.DateTimeFormat(
      this.getIntlLocale(targetLocale),
      styleMap[options?.style || 'medium'],
    );

    return formatter.format(dateObj);
  }

  formatTime(date: Date | string | number, locale?: SupportedLocale, options?: FormatOptions): string {
    const targetLocale = locale || this.defaultLocale;
    const dateObj = date instanceof Date ? date : new Date(date);

    const styleMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { timeStyle: 'short' },
      medium: { timeStyle: 'medium' },
      long: { timeStyle: 'long' },
      full: { timeStyle: 'full' },
    };

    const formatter = new Intl.DateTimeFormat(
      this.getIntlLocale(targetLocale),
      styleMap[options?.style || 'short'],
    );

    return formatter.format(dateObj);
  }

  formatDateTime(date: Date | string | number, locale?: SupportedLocale, options?: FormatOptions): string {
    const targetLocale = locale || this.defaultLocale;
    const dateObj = date instanceof Date ? date : new Date(date);

    const styleMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short', timeStyle: 'short' },
      medium: { dateStyle: 'medium', timeStyle: 'short' },
      long: { dateStyle: 'long', timeStyle: 'medium' },
      full: { dateStyle: 'full', timeStyle: 'full' },
    };

    const formatter = new Intl.DateTimeFormat(
      this.getIntlLocale(targetLocale),
      styleMap[options?.style || 'medium'],
    );

    return formatter.format(dateObj);
  }

  formatRelativeTime(date: Date | string | number, locale?: SupportedLocale): string {
    const targetLocale = locale || this.defaultLocale;
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const formatter = new Intl.RelativeTimeFormat(this.getIntlLocale(targetLocale), {
      numeric: 'auto',
    });

    if (Math.abs(diffSec) < 60) {
      return formatter.format(diffSec, 'second');
    } else if (Math.abs(diffMin) < 60) {
      return formatter.format(diffMin, 'minute');
    } else if (Math.abs(diffHour) < 24) {
      return formatter.format(diffHour, 'hour');
    } else {
      return formatter.format(diffDay, 'day');
    }
  }

  formatPercentage(value: number, locale?: SupportedLocale, decimals: number = 0): string {
    const targetLocale = locale || this.defaultLocale;

    const formatter = new Intl.NumberFormat(this.getIntlLocale(targetLocale), {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return formatter.format(value / 100);
  }

  private getIntlLocale(locale: SupportedLocale): string {
    const map: Record<SupportedLocale, string> = {
      ro: 'ro-RO',
      en: 'en-US',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
    };
    return map[locale];
  }

  // Locale Management

  getLocaleConfig(locale: SupportedLocale): LocaleConfig | undefined {
    return this.localeConfigs.get(locale);
  }

  getAllLocales(): LocaleConfig[] {
    return Array.from(this.localeConfigs.values());
  }

  getSupportedLocales(): SupportedLocale[] {
    return Array.from(this.localeConfigs.keys());
  }

  setDefaultLocale(locale: SupportedLocale): void {
    if (!this.localeConfigs.has(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }

    this.defaultLocale = locale;

    this.eventEmitter.emit('locale.default.changed', { locale });
  }

  getDefaultLocale(): SupportedLocale {
    return this.defaultLocale;
  }

  setFallbackLocale(locale: SupportedLocale): void {
    if (!this.localeConfigs.has(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }

    this.fallbackLocale = locale;
  }

  getFallbackLocale(): SupportedLocale {
    return this.fallbackLocale;
  }

  detectLocale(acceptLanguage?: string): SupportedLocale {
    if (!acceptLanguage) {
      return this.defaultLocale;
    }

    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q = 'q=1'] = lang.trim().split(';');
        return {
          code: code.split('-')[0].toLowerCase() as SupportedLocale,
          quality: parseFloat(q.split('=')[1] || '1'),
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      if (this.localeConfigs.has(lang.code)) {
        return lang.code;
      }
    }

    return this.defaultLocale;
  }

  // Translation Management

  addTranslation(
    translation: Omit<TranslationKey, 'id' | 'createdAt' | 'updatedAt'>,
  ): TranslationKey {
    const id = this.generateId('trans');
    const now = new Date();

    const newTranslation: TranslationKey = {
      ...translation,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.translations.set(translation.key, newTranslation);

    this.eventEmitter.emit('translation.added', { key: translation.key });

    return newTranslation;
  }

  updateTranslation(
    key: string,
    updates: Partial<Omit<TranslationKey, 'id' | 'key' | 'createdAt' | 'updatedAt'>>,
  ): TranslationKey {
    const translation = this.translations.get(key);
    if (!translation) {
      throw new Error(`Translation not found: ${key}`);
    }

    const updated: TranslationKey = {
      ...translation,
      ...updates,
      translations: { ...translation.translations, ...updates.translations },
      updatedAt: new Date(),
    };

    this.translations.set(key, updated);

    this.eventEmitter.emit('translation.updated', { key });

    return updated;
  }

  deleteTranslation(key: string): void {
    if (!this.translations.has(key)) {
      throw new Error(`Translation not found: ${key}`);
    }

    this.translations.delete(key);

    this.eventEmitter.emit('translation.deleted', { key });
  }

  getTranslation(key: string): TranslationKey | undefined {
    return this.translations.get(key);
  }

  getTranslationsByCategory(category: TranslationCategory): TranslationKey[] {
    return Array.from(this.translations.values()).filter((t) => t.category === category);
  }

  getAllTranslations(): TranslationKey[] {
    return Array.from(this.translations.values());
  }

  getMissingTranslations(locale: SupportedLocale): TranslationKey[] {
    return Array.from(this.translations.values()).filter(
      (t) => !t.translations[locale] || t.translations[locale].trim() === '',
    );
  }

  // Romanian-specific Methods

  normalizeRomanianText(text: string): string {
    // Convert old Romanian diacritics to new standard
    const oldToNew: Record<string, string> = {
      'Ş': 'Ș',
      'ş': 'ș',
      'Ţ': 'Ț',
      'ţ': 'ț',
    };

    return text.replace(/[ŞşŢţ]/g, (char) => oldToNew[char] || char);
  }

  removeRomanianDiacritics(text: string): string {
    const diacriticsMap: Record<string, string> = {
      'ă': 'a', 'Ă': 'A',
      'â': 'a', 'Â': 'A',
      'î': 'i', 'Î': 'I',
      'ș': 's', 'Ș': 'S',
      'ț': 't', 'Ț': 'T',
    };

    return text.replace(/[ăĂâÂîÎșȘțȚ]/g, (char) => diacriticsMap[char] || char);
  }

  // Statistics

  getStats(): LocalizationStats {
    const translations = Array.from(this.translations.values());
    const locales = this.getSupportedLocales();

    const translatedByLocale: Record<SupportedLocale, number> = {} as any;
    const missingByLocale: Record<SupportedLocale, number> = {} as any;
    const coverageByLocale: Record<SupportedLocale, number> = {} as any;
    const byCategory: Record<TranslationCategory, number> = {} as any;

    for (const locale of locales) {
      const translated = translations.filter(
        (t) => t.translations[locale] && t.translations[locale].trim() !== '',
      ).length;
      const missing = translations.length - translated;

      translatedByLocale[locale] = translated;
      missingByLocale[locale] = missing;
      coverageByLocale[locale] = translations.length > 0 ? (translated / translations.length) * 100 : 100;
    }

    for (const translation of translations) {
      byCategory[translation.category] = (byCategory[translation.category] || 0) + 1;
    }

    return {
      totalKeys: translations.length,
      translatedByLocale,
      missingByLocale,
      coverageByLocale,
      byCategory,
      recentlyUpdated: translations
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 10),
    };
  }

  // Helper Methods

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
