import slugify from 'slugify';

export function makeSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

const cache = new Map<string, string>();
const MAX_CACHE = 5000;

export async function translateToEnglish(text: string): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY;
  const clean = text?.trim();
  if (!apiKey || !clean) return text;

  const hit = cache.get(clean);
  if (hit !== undefined) return hit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const response = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${apiKey}` },
      body: JSON.stringify({ text: [clean], source_lang: 'FR', target_lang: 'EN-US' }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[deepl] HTTP ${response.status}`);
      return text;
    }
    const data = (await response.json()) as { translations?: { text: string }[] };
    const translated = data.translations?.[0]?.text ?? text;
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(clean, translated);
    return translated;
  } catch (error) {
    console.error('[deepl] échec de traduction:', (error as Error).message);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildTranslations(name: string, description?: string | null) {
  const frSlug = makeSlug(name);

  const [nameEn, descriptionEn] = await Promise.all([
    translateToEnglish(name),
    description ? translateToEnglish(description) : Promise.resolve(null),
  ]);

  const enSlug = makeSlug(nameEn) || frSlug;

  return [
    { locale: 'fr', name, slug: frSlug, description: description ?? null },
    { locale: 'en', name: nameEn, slug: enSlug, description: descriptionEn },
  ];
}