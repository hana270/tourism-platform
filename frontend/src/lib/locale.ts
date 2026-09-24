import { locales, defaultLocale, type Locale } from '@/i18n/config';

export { locales, defaultLocale };
export type { Locale };

export const localeLabels = {
  fr: 'Français',
  en: 'English',
} as const;

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split('/').filter(Boolean)[0] as Locale | undefined;
  return segment && locales.includes(segment) ? segment : defaultLocale;
}

export function isRtl(_locale: string): boolean {
  return false;
}

export const intlLocales = {
  fr: 'fr-FR',
  en: 'en-GB',
} as const;

export const toIntl = (locale: string) => intlLocales[locale as Locale] ?? 'fr-FR';
