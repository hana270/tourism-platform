import type { Metadata } from 'next';
import { locales, defaultLocale, isRtl } from '@/i18n/config';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function localizedAlternates(locale: string, path = '') {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${clean}`])),
      'x-default': `/${defaultLocale}${clean}`,
    },
  };
}

export function pageMetadata({
  locale,
  title,
  path = '',
  description,
  index = false,
}: {
  locale: string;
  title: string;
  path?: string;
  description?: string;
  index?: boolean;
}): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    alternates: localizedAlternates(locale, path),
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, locale, siteName: 'IHOST', type: 'website' },
  };
}

export const htmlDir = (locale: string): 'rtl' | 'ltr' => (isRtl(locale) ? 'rtl' : 'ltr');