/**
 * Langue source de l'application : le français.
 *
 * Il n'existe qu'une seule locale dans le routage (`/fr/...`).
 * Toutes les autres langues sont fournies à la demande par Google Translate
 * (voir `components/layout/GoogleTranslateWidget.tsx`), sans aucun fichier
 * de traduction dans le projet.
 */
export const locales = ['fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
};

export const rtlLocales: readonly Locale[] = [];
export const isRtl = (_locale: string) => false;

export const intlLocales: Record<Locale, string> = {
  fr: 'fr-FR',
};

export const toIntl = (locale: string) => intlLocales[locale as Locale] ?? 'fr-FR';
export const toHtmlLang = (locale: string) =>
  (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
