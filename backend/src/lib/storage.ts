import { env } from '@/config/env';

/**
 * Stockage persistant des images : Supabase Storage (bucket PUBLIC).
 *
 * Pourquoi : le disque de Render (et de Vercel) est éphémère. Tout fichier écrit
 * dans backend/uploads disparaît à chaque redéploiement/redémarrage, alors que
 * la base de données (Supabase) garde les liens -> images cassées en ligne.
 * Ici chaque image est envoyée dans un bucket public et la base ne stocke
 * que l'URL publique complète, valable partout (local, Render, Vercel).
 *
 * Aucune dépendance supplémentaire : on utilise l'API REST de Supabase Storage.
 */

const BASE = env.SUPABASE_URL.replace(/\/+$/, '');
export const STORAGE_BUCKET = env.SUPABASE_BUCKET;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const VARIANT_FILES = ['thumbnail.webp', 'medium.webp', 'large.webp'] as const;
const TIMEOUT_MS = 30_000;

const auth = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** URL publique d'un objet du bucket. */
export function publicUrl(objectPath: string) {
  return `${BASE}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePath(objectPath)}`;
}

/** Chemin d'objet à partir d'une URL publique (null si l'URL n'appartient pas au bucket). */
export function objectPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const rest = url.slice(index + marker.length).split('?')[0];
  try {
    return rest.split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
}

async function fail(action: string, res: Response): Promise<never> {
  const detail = await res.text().catch(() => '');
  console.error(`[storage] ${action} a échoué (${res.status}) : ${detail}`);
  throw new Error(`Stockage des images indisponible (${action}, HTTP ${res.status}).`);
}

/** Envoie un fichier dans le bucket et retourne son URL publique. */
export async function uploadObject(objectPath: string, body: Buffer, contentType = 'image/webp'): Promise<string> {
  const res = await fetch(`${BASE}/storage/v1/object/${STORAGE_BUCKET}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': contentType,
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'true',
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) await fail('upload', res);
  return publicUrl(objectPath);
}

/** Supprime des objets. Ne lève jamais d'erreur : un fichier orphelin ne doit pas bloquer l'API. */
export async function deleteObjects(paths: string[]) {
  if (paths.length === 0) return;
  try {
    const res = await fetch(`${BASE}/storage/v1/object/${STORAGE_BUCKET}`, {
      method: 'DELETE',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[storage] suppression partielle (${res.status}) : ${await res.text().catch(() => '')}`);
  } catch (error) {
    console.warn('[storage] suppression impossible :', error);
  }
}

/**
 * Supprime les fichiers liés à des URLs publiques. Si l'URL pointe vers une variante
 * (thumbnail/medium/large.webp), les trois variantes du même dossier sont supprimées.
 */
export async function deleteStoredUrls(urls: (string | null | undefined)[]) {
  const paths = new Set<string>();
  for (const url of urls) {
    const objectPath = objectPathFromUrl(url);
    if (!objectPath) continue; // URL externe ou ancien /uploads/... : rien à supprimer ici
    const slash = objectPath.lastIndexOf('/');
    const dir = objectPath.slice(0, slash);
    const file = objectPath.slice(slash + 1);
    if ((VARIANT_FILES as readonly string[]).includes(file)) VARIANT_FILES.forEach((v) => paths.add(`${dir}/${v}`));
    else paths.add(objectPath);
  }
  await deleteObjects([...paths]);
}

async function listFolder(prefix: string): Promise<{ name: string; id: string | null }[]> {
  const items: { name: string; id: string | null }[] = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${BASE}/storage/v1/object/list/${STORAGE_BUCKET}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) await fail('list', res);
    const page = (await res.json()) as { name: string; id: string | null }[];
    items.push(...page);
    if (page.length < 100) return items;
  }
}

/** Supprime récursivement tout un dossier du bucket (utilisé par la réinitialisation des données). */
export async function removePrefix(prefix: string) {
  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const item of await listFolder(dir)) {
      const full = dir ? `${dir}/${item.name}` : item.name;
      if (item.id === null) await walk(full); // sous-dossier
      else files.push(full);
    }
  };
  await walk(prefix);
  for (let i = 0; i < files.length; i += 100) await deleteObjects(files.slice(i, i + 100));
  return files.length;
}

/** Crée le bucket public s'il n'existe pas (ou le rend public s'il ne l'est pas). */
export async function ensurePublicBucket() {
  const headers = { ...auth, 'Content-Type': 'application/json' };
  const found = await fetch(`${BASE}/storage/v1/bucket/${STORAGE_BUCKET}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (found.status === 200) {
    const bucket = (await found.json()) as { public?: boolean };
    if (bucket.public) return 'existe déjà (public)';
    const res = await fetch(`${BASE}/storage/v1/bucket/${STORAGE_BUCKET}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ public: true }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) await fail('bucket public', res);
    return 'existait en privé -> passé en public';
  }
  const res = await fetch(`${BASE}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: STORAGE_BUCKET,
      name: STORAGE_BUCKET,
      public: true,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: ['image/webp', 'image/jpeg', 'image/png'],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) await fail('création du bucket', res);
  return 'créé (public)';
}
