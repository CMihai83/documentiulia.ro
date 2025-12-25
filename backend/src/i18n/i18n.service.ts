/**
 * Internationalization (i18n) Service
 * Sprint 42: Multi-Language Support for EU Markets
 *
 * Provides multi-language support for the platform including:
 * - Translation management
 * - Locale detection and switching
 * - Date/Number formatting
 * - Currency formatting
 * - Pluralization rules
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Supported Locales
export enum SupportedLocale {
  RO = 'ro', // Romanian (default)
  EN = 'en', // English
  DE = 'de', // German
  FR = 'fr', // French
  ES = 'es', // Spanish
  IT = 'it', // Italian
  PL = 'pl', // Polish
  HU = 'hu', // Hungarian
  BG = 'bg', // Bulgarian
  NL = 'nl', // Dutch
}

// Translation Namespace
export enum TranslationNamespace {
  COMMON = 'common',
  AUTH = 'auth',
  FINANCE = 'finance',
  HR = 'hr',
  QUALITY = 'quality',
  WAREHOUSE = 'warehouse',
  CRM = 'crm',
  ERRORS = 'errors',
  VALIDATION = 'validation',
  NOTIFICATIONS = 'notifications',
}

// Interfaces
export interface TranslationEntry {
  key: string;
  namespace: TranslationNamespace;
  translations: Record<SupportedLocale, string>;
  description?: string;
  context?: string;
  lastUpdated: Date;
}

export interface LocaleConfig {
  locale: SupportedLocale;
  displayName: string;
  nativeName: string;
  dateFormat: string;
  timeFormat: string;
  dateTimeFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currencyFormat: Intl.NumberFormatOptions;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
  rtl: boolean;
}

export interface FormattedDate {
  short: string;
  medium: string;
  long: string;
  relative: string;
}

export interface PluralRules {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

@Injectable()
export class I18nService implements OnModuleInit {
  private readonly logger = new Logger(I18nService.name);

  // Translation storage
  private translations: Map<string, TranslationEntry> = new Map();

  // Locale configurations
  private localeConfigs: Map<SupportedLocale, LocaleConfig> = new Map();

  // Default locale
  private defaultLocale: SupportedLocale = SupportedLocale.RO;

  // Current user locales (session-based)
  private userLocales: Map<string, SupportedLocale> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    this.initializeLocaleConfigs();
    this.loadCoreTranslations();
    this.logger.log(`I18n Service initialized with ${this.localeConfigs.size} locales`);
  }

  /**
   * Initialize locale configurations for supported languages
   */
  private initializeLocaleConfigs(): void {
    const configs: LocaleConfig[] = [
      {
        locale: SupportedLocale.RO,
        displayName: 'Romanian',
        nativeName: 'Română',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'RON' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.EN,
        displayName: 'English',
        nativeName: 'English',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'h:mm A',
        dateTimeFormat: 'MM/DD/YYYY h:mm A',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 0,
        rtl: false,
      },
      {
        locale: SupportedLocale.DE,
        displayName: 'German',
        nativeName: 'Deutsch',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.FR,
        displayName: 'French',
        nativeName: 'Français',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD/MM/YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.ES,
        displayName: 'Spanish',
        nativeName: 'Español',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD/MM/YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.IT,
        displayName: 'Italian',
        nativeName: 'Italiano',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD/MM/YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.PL,
        displayName: 'Polish',
        nativeName: 'Polski',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'PLN' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.HU,
        displayName: 'Hungarian',
        nativeName: 'Magyar',
        dateFormat: 'YYYY.MM.DD',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'YYYY.MM.DD HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'HUF' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.BG,
        displayName: 'Bulgarian',
        nativeName: 'Български',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD.MM.YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'BGN' },
        firstDayOfWeek: 1,
        rtl: false,
      },
      {
        locale: SupportedLocale.NL,
        displayName: 'Dutch',
        nativeName: 'Nederlands',
        dateFormat: 'DD-MM-YYYY',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'DD-MM-YYYY HH:mm',
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        currencyFormat: { style: 'currency', currency: 'EUR' },
        firstDayOfWeek: 1,
        rtl: false,
      },
    ];

    for (const config of configs) {
      this.localeConfigs.set(config.locale, config);
    }
  }

  /**
   * Load core translations for all namespaces
   */
  private loadCoreTranslations(): void {
    // Common translations
    this.addTranslations(TranslationNamespace.COMMON, [
      { key: 'app.name', ro: 'DocumentIulia', en: 'DocumentIulia', de: 'DocumentIulia', fr: 'DocumentIulia', es: 'DocumentIulia' },
      { key: 'app.tagline', ro: 'Contabilitate cu Inteligență Artificială', en: 'AI-Powered Accounting', de: 'KI-gestützte Buchhaltung', fr: 'Comptabilité Propulsée par l\'IA', es: 'Contabilidad con Inteligencia Artificial' },
      { key: 'actions.save', ro: 'Salvează', en: 'Save', de: 'Speichern', fr: 'Enregistrer', es: 'Guardar' },
      { key: 'actions.cancel', ro: 'Anulează', en: 'Cancel', de: 'Abbrechen', fr: 'Annuler', es: 'Cancelar' },
      { key: 'actions.delete', ro: 'Șterge', en: 'Delete', de: 'Löschen', fr: 'Supprimer', es: 'Eliminar' },
      { key: 'actions.edit', ro: 'Editează', en: 'Edit', de: 'Bearbeiten', fr: 'Modifier', es: 'Editar' },
      { key: 'actions.create', ro: 'Creează', en: 'Create', de: 'Erstellen', fr: 'Créer', es: 'Crear' },
      { key: 'actions.search', ro: 'Caută', en: 'Search', de: 'Suchen', fr: 'Rechercher', es: 'Buscar' },
      { key: 'actions.filter', ro: 'Filtrează', en: 'Filter', de: 'Filtern', fr: 'Filtrer', es: 'Filtrar' },
      { key: 'actions.export', ro: 'Exportă', en: 'Export', de: 'Exportieren', fr: 'Exporter', es: 'Exportar' },
      { key: 'actions.import', ro: 'Importă', en: 'Import', de: 'Importieren', fr: 'Importer', es: 'Importar' },
      { key: 'actions.submit', ro: 'Trimite', en: 'Submit', de: 'Absenden', fr: 'Soumettre', es: 'Enviar' },
      { key: 'actions.approve', ro: 'Aprobă', en: 'Approve', de: 'Genehmigen', fr: 'Approuver', es: 'Aprobar' },
      { key: 'actions.reject', ro: 'Respinge', en: 'Reject', de: 'Ablehnen', fr: 'Rejeter', es: 'Rechazar' },
      { key: 'status.active', ro: 'Activ', en: 'Active', de: 'Aktiv', fr: 'Actif', es: 'Activo' },
      { key: 'status.inactive', ro: 'Inactiv', en: 'Inactive', de: 'Inaktiv', fr: 'Inactif', es: 'Inactivo' },
      { key: 'status.pending', ro: 'În așteptare', en: 'Pending', de: 'Ausstehend', fr: 'En attente', es: 'Pendiente' },
      { key: 'status.completed', ro: 'Finalizat', en: 'Completed', de: 'Abgeschlossen', fr: 'Terminé', es: 'Completado' },
      { key: 'status.draft', ro: 'Ciornă', en: 'Draft', de: 'Entwurf', fr: 'Brouillon', es: 'Borrador' },
    ]);

    // Auth translations
    this.addTranslations(TranslationNamespace.AUTH, [
      { key: 'login.title', ro: 'Autentificare', en: 'Login', de: 'Anmeldung', fr: 'Connexion', es: 'Iniciar sesión' },
      { key: 'login.email', ro: 'Email', en: 'Email', de: 'E-Mail', fr: 'E-mail', es: 'Correo electrónico' },
      { key: 'login.password', ro: 'Parolă', en: 'Password', de: 'Passwort', fr: 'Mot de passe', es: 'Contraseña' },
      { key: 'login.submit', ro: 'Autentificare', en: 'Sign In', de: 'Anmelden', fr: 'Se connecter', es: 'Iniciar sesión' },
      { key: 'login.forgot', ro: 'Ai uitat parola?', en: 'Forgot password?', de: 'Passwort vergessen?', fr: 'Mot de passe oublié?', es: '¿Olvidaste tu contraseña?' },
      { key: 'register.title', ro: 'Înregistrare', en: 'Register', de: 'Registrieren', fr: 'S\'inscrire', es: 'Registrarse' },
      { key: 'logout', ro: 'Deconectare', en: 'Logout', de: 'Abmelden', fr: 'Déconnexion', es: 'Cerrar sesión' },
    ]);

    // Finance translations
    this.addTranslations(TranslationNamespace.FINANCE, [
      { key: 'invoice.title', ro: 'Factură', en: 'Invoice', de: 'Rechnung', fr: 'Facture', es: 'Factura' },
      { key: 'invoice.number', ro: 'Număr factură', en: 'Invoice Number', de: 'Rechnungsnummer', fr: 'Numéro de facture', es: 'Número de factura' },
      { key: 'invoice.date', ro: 'Data facturii', en: 'Invoice Date', de: 'Rechnungsdatum', fr: 'Date de facture', es: 'Fecha de factura' },
      { key: 'invoice.dueDate', ro: 'Data scadenței', en: 'Due Date', de: 'Fälligkeitsdatum', fr: 'Date d\'échéance', es: 'Fecha de vencimiento' },
      { key: 'invoice.subtotal', ro: 'Subtotal', en: 'Subtotal', de: 'Zwischensumme', fr: 'Sous-total', es: 'Subtotal' },
      { key: 'invoice.vat', ro: 'TVA', en: 'VAT', de: 'MwSt', fr: 'TVA', es: 'IVA' },
      { key: 'invoice.total', ro: 'Total', en: 'Total', de: 'Gesamt', fr: 'Total', es: 'Total' },
      { key: 'payment.title', ro: 'Plată', en: 'Payment', de: 'Zahlung', fr: 'Paiement', es: 'Pago' },
      { key: 'payment.method', ro: 'Metodă de plată', en: 'Payment Method', de: 'Zahlungsmethode', fr: 'Méthode de paiement', es: 'Método de pago' },
      { key: 'payment.status', ro: 'Status plată', en: 'Payment Status', de: 'Zahlungsstatus', fr: 'Statut de paiement', es: 'Estado de pago' },
      { key: 'currency.ron', ro: 'Leu românesc', en: 'Romanian Leu', de: 'Rumänischer Leu', fr: 'Leu roumain', es: 'Leu rumano' },
      { key: 'currency.eur', ro: 'Euro', en: 'Euro', de: 'Euro', fr: 'Euro', es: 'Euro' },
    ]);

    // HR translations
    this.addTranslations(TranslationNamespace.HR, [
      { key: 'employee.title', ro: 'Angajat', en: 'Employee', de: 'Mitarbeiter', fr: 'Employé', es: 'Empleado' },
      { key: 'employee.name', ro: 'Nume', en: 'Name', de: 'Name', fr: 'Nom', es: 'Nombre' },
      { key: 'employee.position', ro: 'Funcție', en: 'Position', de: 'Position', fr: 'Poste', es: 'Puesto' },
      { key: 'employee.department', ro: 'Departament', en: 'Department', de: 'Abteilung', fr: 'Département', es: 'Departamento' },
      { key: 'employee.salary', ro: 'Salariu', en: 'Salary', de: 'Gehalt', fr: 'Salaire', es: 'Salario' },
      { key: 'contract.title', ro: 'Contract', en: 'Contract', de: 'Vertrag', fr: 'Contrat', es: 'Contrato' },
      { key: 'payroll.title', ro: 'Salarizare', en: 'Payroll', de: 'Gehaltsabrechnung', fr: 'Paie', es: 'Nómina' },
      { key: 'leave.title', ro: 'Concediu', en: 'Leave', de: 'Urlaub', fr: 'Congé', es: 'Vacaciones' },
    ]);

    // Quality translations
    this.addTranslations(TranslationNamespace.QUALITY, [
      { key: 'ncr.title', ro: 'Raport de neconformitate', en: 'Non-Conformance Report', de: 'Nichtkonformitätsbericht', fr: 'Rapport de non-conformité', es: 'Informe de no conformidad' },
      { key: 'capa.title', ro: 'Acțiune corectivă/preventivă', en: 'Corrective/Preventive Action', de: 'Korrektur-/Vorbeugemaßnahme', fr: 'Action corrective/préventive', es: 'Acción correctiva/preventiva' },
      { key: 'inspection.title', ro: 'Inspecție', en: 'Inspection', de: 'Inspektion', fr: 'Inspection', es: 'Inspección' },
      { key: 'audit.title', ro: 'Audit', en: 'Audit', de: 'Audit', fr: 'Audit', es: 'Auditoría' },
    ]);

    // Error translations
    this.addTranslations(TranslationNamespace.ERRORS, [
      { key: 'general', ro: 'A apărut o eroare', en: 'An error occurred', de: 'Ein Fehler ist aufgetreten', fr: 'Une erreur s\'est produite', es: 'Ha ocurrido un error' },
      { key: 'notFound', ro: 'Resursa nu a fost găsită', en: 'Resource not found', de: 'Ressource nicht gefunden', fr: 'Ressource non trouvée', es: 'Recurso no encontrado' },
      { key: 'unauthorized', ro: 'Acces neautorizat', en: 'Unauthorized access', de: 'Unbefugter Zugriff', fr: 'Accès non autorisé', es: 'Acceso no autorizado' },
      { key: 'forbidden', ro: 'Acces interzis', en: 'Access forbidden', de: 'Zugriff verboten', fr: 'Accès interdit', es: 'Acceso prohibido' },
      { key: 'validation', ro: 'Eroare de validare', en: 'Validation error', de: 'Validierungsfehler', fr: 'Erreur de validation', es: 'Error de validación' },
      { key: 'network', ro: 'Eroare de rețea', en: 'Network error', de: 'Netzwerkfehler', fr: 'Erreur réseau', es: 'Error de red' },
    ]);

    // Validation translations
    this.addTranslations(TranslationNamespace.VALIDATION, [
      { key: 'required', ro: 'Câmpul este obligatoriu', en: 'This field is required', de: 'Dieses Feld ist erforderlich', fr: 'Ce champ est obligatoire', es: 'Este campo es obligatorio' },
      { key: 'email', ro: 'Adresa de email nu este validă', en: 'Invalid email address', de: 'Ungültige E-Mail-Adresse', fr: 'Adresse e-mail invalide', es: 'Dirección de correo inválida' },
      { key: 'minLength', ro: 'Minim {{min}} caractere', en: 'Minimum {{min}} characters', de: 'Mindestens {{min}} Zeichen', fr: 'Minimum {{min}} caractères', es: 'Mínimo {{min}} caracteres' },
      { key: 'maxLength', ro: 'Maxim {{max}} caractere', en: 'Maximum {{max}} characters', de: 'Maximal {{max}} Zeichen', fr: 'Maximum {{max}} caractères', es: 'Máximo {{max}} caracteres' },
      { key: 'pattern', ro: 'Format invalid', en: 'Invalid format', de: 'Ungültiges Format', fr: 'Format invalide', es: 'Formato inválido' },
    ]);

    this.logger.log(`Loaded ${this.translations.size} translations`);
  }

  /**
   * Add translations for a namespace
   */
  private addTranslations(
    namespace: TranslationNamespace,
    entries: Array<{ key: string; ro: string; en: string; de: string; fr: string; es: string }>,
  ): void {
    for (const entry of entries) {
      const fullKey = `${namespace}.${entry.key}`;
      this.translations.set(fullKey, {
        key: entry.key,
        namespace,
        translations: {
          [SupportedLocale.RO]: entry.ro,
          [SupportedLocale.EN]: entry.en,
          [SupportedLocale.DE]: entry.de,
          [SupportedLocale.FR]: entry.fr,
          [SupportedLocale.ES]: entry.es,
          [SupportedLocale.IT]: entry.en, // Fallback to English
          [SupportedLocale.PL]: entry.en,
          [SupportedLocale.HU]: entry.en,
          [SupportedLocale.BG]: entry.en,
          [SupportedLocale.NL]: entry.en,
        },
        lastUpdated: new Date(),
      });
    }
  }

  // =================== PUBLIC API ===================

  /**
   * Translate a key
   */
  t(
    key: string,
    locale?: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    const targetLocale = locale || this.defaultLocale;
    const entry = this.translations.get(key);

    if (!entry) {
      this.logger.warn(`Translation not found: ${key}`);
      return key;
    }

    let translation = entry.translations[targetLocale] || entry.translations[this.defaultLocale] || key;

    // Replace parameters
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }
    }

    return translation;
  }

  /**
   * Translate with namespace
   */
  translate(
    namespace: TranslationNamespace,
    key: string,
    locale?: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    return this.t(`${namespace}.${key}`, locale, params);
  }

  /**
   * Get all translations for a locale
   */
  getTranslations(locale: SupportedLocale): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, entry] of this.translations.entries()) {
      result[key] = entry.translations[locale] || entry.translations[this.defaultLocale];
    }

    return result;
  }

  /**
   * Get translations for a namespace
   */
  getNamespaceTranslations(
    namespace: TranslationNamespace,
    locale: SupportedLocale,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    const prefix = `${namespace}.`;

    for (const [key, entry] of this.translations.entries()) {
      if (key.startsWith(prefix)) {
        const shortKey = key.substring(prefix.length);
        result[shortKey] = entry.translations[locale] || entry.translations[this.defaultLocale];
      }
    }

    return result;
  }

  /**
   * Set user locale
   */
  setUserLocale(userId: string, locale: SupportedLocale): void {
    this.userLocales.set(userId, locale);
    this.eventEmitter.emit('i18n.locale.changed', { userId, locale });
  }

  /**
   * Get user locale
   */
  getUserLocale(userId: string): SupportedLocale {
    return this.userLocales.get(userId) || this.defaultLocale;
  }

  /**
   * Get supported locales
   */
  getSupportedLocales(): LocaleConfig[] {
    return Array.from(this.localeConfigs.values());
  }

  /**
   * Get locale configuration
   */
  getLocaleConfig(locale: SupportedLocale): LocaleConfig | null {
    return this.localeConfigs.get(locale) || null;
  }

  /**
   * Check if locale is supported
   */
  isLocaleSupported(locale: string): boolean {
    return this.localeConfigs.has(locale as SupportedLocale);
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date, locale: SupportedLocale, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: 'numeric', month: 'numeric', year: 'numeric' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' },
    };

    return new Intl.DateTimeFormat(locale, formatOptions[format]).format(date);
  }

  /**
   * Format time according to locale
   */
  formatTime(date: Date, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  }

  /**
   * Format date and time according to locale
   */
  formatDateTime(date: Date, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  }

  /**
   * Format number according to locale
   */
  formatNumber(value: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions): string {
    const config = this.localeConfigs.get(locale);
    return new Intl.NumberFormat(locale, options || config?.numberFormat).format(value);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(
    value: number,
    currency: string,
    locale: SupportedLocale,
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(date: Date, locale: SupportedLocale): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  }

  /**
   * Pluralize a word based on count
   */
  pluralize(
    count: number,
    locale: SupportedLocale,
    rules: PluralRules,
  ): string {
    const pr = new Intl.PluralRules(locale);
    const rule = pr.select(count);

    switch (rule) {
      case 'zero':
        return rules.zero || rules.other;
      case 'one':
        return rules.one;
      case 'two':
        return rules.two || rules.other;
      case 'few':
        return rules.few || rules.other;
      case 'many':
        return rules.many || rules.other;
      default:
        return rules.other;
    }
  }

  /**
   * Add or update a translation
   */
  setTranslation(
    key: string,
    namespace: TranslationNamespace,
    translations: Partial<Record<SupportedLocale, string>>,
  ): void {
    const fullKey = `${namespace}.${key}`;
    const existing = this.translations.get(fullKey);

    const entry: TranslationEntry = {
      key,
      namespace,
      translations: {
        ...Object.fromEntries(
          Object.values(SupportedLocale).map(l => [l, '']),
        ) as Record<SupportedLocale, string>,
        ...existing?.translations,
        ...translations,
      },
      lastUpdated: new Date(),
    };

    this.translations.set(fullKey, entry);
  }

  /**
   * Get default locale
   */
  getDefaultLocale(): SupportedLocale {
    return this.defaultLocale;
  }

  /**
   * Set default locale
   */
  setDefaultLocale(locale: SupportedLocale): void {
    if (this.localeConfigs.has(locale)) {
      this.defaultLocale = locale;
      this.eventEmitter.emit('i18n.default.changed', { locale });
    }
  }

  /**
   * Detect locale from Accept-Language header
   */
  detectLocale(acceptLanguage: string): SupportedLocale {
    if (!acceptLanguage) return this.defaultLocale;

    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          quality: qValue ? parseFloat(qValue) : 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { code } of languages) {
      if (this.isLocaleSupported(code)) {
        return code as SupportedLocale;
      }
    }

    return this.defaultLocale;
  }
}
