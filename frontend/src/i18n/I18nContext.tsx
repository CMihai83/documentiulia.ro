import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

// Types
interface LocaleSettings {
  date_format: string;
  time_format: string;
  first_day_of_week: number;
  decimal_separator: string;
  thousands_separator: string;
  currency_position: 'before' | 'after';
  currency: string;
  timezone: string;
}

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag: string;
  rtl: boolean;
}

interface TranslationParams {
  [key: string]: string | number;
}

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: TranslationParams, namespace?: string) => string;
  languages: Language[];
  locale: LocaleSettings;
  isLoading: boolean;
  formatDate: (date: string | Date, format?: 'short' | 'medium' | 'long' | 'full') => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (number: number, decimals?: number) => string;
}

// Default values
const defaultLocale: LocaleSettings = {
  date_format: 'DD.MM.YYYY',
  time_format: 'HH:mm',
  first_day_of_week: 1,
  decimal_separator: ',',
  thousands_separator: '.',
  currency_position: 'after',
  currency: 'RON',
  timezone: 'Europe/Bucharest'
};

const defaultContext: I18nContextType = {
  language: 'ro',
  setLanguage: () => {},
  t: (key) => key,
  languages: [],
  locale: defaultLocale,
  isLoading: true,
  formatDate: (date) => String(date),
  formatCurrency: (amount) => String(amount),
  formatNumber: (number) => String(number)
};

// Create context
const I18nContext = createContext<I18nContextType>(defaultContext);

// Provider component
interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLanguage = 'ro'
}) => {
  const [language, setLanguageState] = useState<string>(() => {
    // Try to get from localStorage first
    const stored = localStorage.getItem('language');
    return stored || defaultLanguage;
  });

  const [translations, setTranslations] = useState<Record<string, Record<string, any>>>({});
  const [languages, setLanguages] = useState<Language[]>([]);
  const [locale, setLocale] = useState<LocaleSettings>(defaultLocale);
  const [isLoading, setIsLoading] = useState(true);

  // Load languages list
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch('/api/v1/i18n/languages.php');
        const data = await response.json();
        if (data.success) {
          setLanguages(data.data);
        }
      } catch (error) {
        console.error('Failed to load languages:', error);
        // Fallback languages
        setLanguages([
          { code: 'ro', name: 'Romanian', native_name: 'Romana', flag: '', rtl: false },
          { code: 'en', name: 'English', native_name: 'English', flag: '', rtl: false }
        ]);
      }
    };
    loadLanguages();
  }, []);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const namespaces = 'common,nav,auth,invoices,expenses,contacts,projects,inventory,accounting,fiscal';
        const response = await fetch(
          `/api/v1/i18n/translations.php?lang=${language}&namespaces=${namespaces}`
        );
        const data = await response.json();
        if (data.success) {
          setTranslations(data.data.translations);
          setLocale(data.data.locale);
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTranslations();
  }, [language]);

  // Set language
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: TranslationParams, namespace?: string): string => {
    // Parse namespace from key if not provided (e.g., "common.save")
    let ns = namespace;
    let actualKey = key;

    if (!ns && key.includes('.')) {
      const parts = key.split('.');
      ns = parts[0];
      actualKey = parts.slice(1).join('.');
    }

    ns = ns || 'common';

    // Get translation value
    const nsTranslations = translations[ns] || {};
    let value = getNestedValue(nsTranslations, actualKey);

    if (value === undefined) {
      // Return key if translation not found
      return actualKey;
    }

    // Replace parameters
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      });
    }

    return value;
  }, [translations]);

  // Format date
  const formatDate = useCallback((date: string | Date, format: 'short' | 'medium' | 'long' | 'full' = 'medium'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: '2-digit', month: 'short', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    };
    const options = optionsMap[format];

    return new Intl.DateTimeFormat(language, options).format(d);
  }, [language]);

  // Format currency
  const formatCurrency = useCallback((amount: number, currency?: string): string => {
    const curr = currency || locale.currency;
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: curr === 'RON' ? 'RON' : curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, [language, locale.currency]);

  // Format number
  const formatNumber = useCallback((number: number, decimals: number = 0): string => {
    return new Intl.NumberFormat(language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  }, [language]);

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    languages,
    locale,
    isLoading,
    formatDate,
    formatCurrency,
    formatNumber
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook to use i18n
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Hook for just translations
export const useTranslation = (namespace?: string) => {
  const { t, language, isLoading } = useI18n();

  const translate = useCallback((key: string, params?: TranslationParams) => {
    return t(key, params, namespace);
  }, [t, namespace]);

  return { t: translate, language, isLoading };
};

// Helper function to get nested value
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

// Language Switcher Component
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage, languages } = useI18n();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className={`language-switcher ${className}`}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.native_name}
        </option>
      ))}
    </select>
  );
};

export default I18nContext;
