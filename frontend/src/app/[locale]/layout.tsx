import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';
import { createTranslator } from '@/i18n/translate';
import { SITE_URL, htmlDir, localizedAlternates } from '@/lib/seo';
import GoogleTranslateEngine from '@/components/layout/GoogleTranslateEngine';
import '../globals.css';
import '../google-translate.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = createTranslator('meta');
  let siteLogo = '';
  let siteName = 'IHOST';

  try {
    const origin = (
      process.env.NEXT_PUBLIC_API_ORIGIN ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000'
    )
      .replace(/\/$/, '')
      .replace(/\/api(\/v1)?$/, '');

    const response = await fetch(`${origin}/api/v1/settings/homepage`, { cache: 'no-store' });

    if (response.ok) {
      const body = await response.json();
      siteLogo = body.data?.logo || '';
      siteName = body.data?.nomSite || siteName;
    }
  } catch {}

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('siteTitle', { siteName }), template: `%s | ${siteName}` },
    description: t('siteDescription'),
    alternates: localizedAlternates(locale),
    robots: { index: false, follow: false },
    applicationName: siteName,
    icons: siteLogo ? { icon: siteLogo, shortcut: siteLogo, apple: siteLogo } : undefined,
    openGraph: {
      title: t('siteTitle', { siteName }),
      description: t('siteDescription'),
      locale,
      siteName,
      type: 'website',
    },
  };
}

/**
 * Exécuté avant l'affichage : thème sombre/clair et sens de lecture
 * (arabe = droite → gauche) selon la langue Google Translate mémorisée.
 */
const initScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('ihost-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    if (/(?:^|;\\s*)googtrans=\\/[^;/]*\\/ar(?:;|$)/.test(document.cookie)) {
      document.documentElement.dir = 'rtl';
    }
  } catch (e) {}
})();
`;

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(locales as readonly string[]).includes(locale)) notFound();

  return (
    <html lang={locale} dir={htmlDir(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="font-sans">
        {children}
        <GoogleTranslateEngine />
      </body>
    </html>
  );
}
