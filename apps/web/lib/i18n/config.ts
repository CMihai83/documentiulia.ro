export const locales = ['ro', 'en'] as const;
export const defaultLocale = 'ro' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ro: 'Română',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  ro: '🇷🇴',
  en: '🇬🇧',
};
