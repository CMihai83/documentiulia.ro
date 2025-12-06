import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    messages: (await import(`../../messages/${validLocale}.json`)).default,
    timeZone: 'Europe/Bucharest',
    now: new Date(),
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
        medium: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
        long: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        },
      },
      number: {
        currency: {
          style: 'currency',
          currency: 'RON',
        },
        percent: {
          style: 'percent',
          minimumFractionDigits: 1,
        },
      },
    },
  };
});
