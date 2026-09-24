import { catalog, type Messages } from './catalog';
import { defaultLocale } from './config';

export type TranslationValues = Record<string, string | number | boolean | null | undefined>;
export type Translator = (key: string, values?: TranslationValues) => string;

function lookup(path: string): string | undefined {
  let node: string | Messages | undefined = catalog;
  for (const part of path.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

/** Creates a stable translator. Stable identity is important for React effect dependencies. */
export function createTranslator(namespace?: string): Translator {
  return (key, values) => {
    const path = namespace ? `${namespace}.${key}` : key;
    const message = lookup(path);
    if (message === undefined) {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] Clé manquante dans catalog.ts : ${path}`);
      return path;
    }
    return interpolate(message, values);
  };
}

/** Cached translators prevent useEffect/useCallback dependency loops on dashboard pages. */
const translatorCache = new Map<string, Translator>();
export function useTranslations(namespace?: string): Translator {
  const cacheKey = namespace ?? '__root__';
  let translator = translatorCache.get(cacheKey);
  if (!translator) {
    translator = createTranslator(namespace);
    translatorCache.set(cacheKey, translator);
  }
  return translator;
}

export const useLocale = (): string => defaultLocale;
