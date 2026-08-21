import { locales, defaultLocale } from '@/i18n';

/**
 * REQ-049 B6 — locale prefix for building absolute app paths from a pathname.
 * next-intl runs with localePrefix 'as-needed': the default locale (ro) is
 * UNPREFIXED. `pathname.split('/')[1]` therefore yields 'dashboard' for a
 * Romanian user, and code that did `/${'dashboard'}/login` sent them to a 404.
 */
export function localePrefixFromPath(pathname: string): string {
  const seg = (pathname || '').split('/')[1] || '';
  if ((locales as readonly string[]).includes(seg) && seg !== defaultLocale) return `/${seg}`;
  return '';
}
