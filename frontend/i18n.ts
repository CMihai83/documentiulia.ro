import { getRequestConfig } from 'next-intl/server';

export const locales = ['ro', 'en', 'de', 'fr', 'es'] as const;
export const defaultLocale = 'ro' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request
  let locale = await requestLocale;

  // Fallback to default locale if not provided or invalid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
