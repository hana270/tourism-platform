import axios from 'axios';
import { friendlyErrorMessage } from './form-errors';

export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_ORIGIN ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
)
  .replace(/\/$/, '')
  .replace(/\/api(\/v1)?$/, '');

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  headers: { Accept: 'application/json' },
  withCredentials: true,
  timeout: 20_000,
});

// Les envois de fichiers (images) sont plus longs qu'une requête classique :
// on leur laisse 2 minutes au lieu de 8 secondes, sans limite de taille côté client.
const UPLOAD_TIMEOUT_MS = 120_000;
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.timeout = UPLOAD_TIMEOUT_MS;
    config.maxBodyLength = Infinity;
    config.maxContentLength = Infinity;
  }
  return config;
});

// Nouvel essai automatique (une fois) pour les lectures en cas de lenteur / coupure réseau.
type RetriableConfig = { __retried?: boolean; method?: string };
api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as (RetriableConfig & Record<string, unknown>) | undefined;
  const isGet = (config?.method ?? 'get').toLowerCase() === 'get';
  const transient = !error?.response || error.response.status >= 502;
  if (config && isGet && transient && !config.__retried) {
    config.__retried = true;
    await new Promise((resolve) => setTimeout(resolve, 700));
    return api(config as never);
  }
  return Promise.reject(error);
});

export function imageUrl(path: string | null | undefined, fallbackFolder?: string): string {
  if (!path) return '';
  const cleanPath = String(path).trim().replace(/\\/g, '/');
  const configuredAssetOrigin = process.env.NEXT_PUBLIC_ASSET_ORIGIN?.trim().replace(/\/$/, '');
  const assetOrigin = (configuredAssetOrigin && !/example\.com|localhost:4000/i.test(configuredAssetOrigin)
    ? configuredAssetOrigin
    : API_ORIGIN)
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
  // Les anciens enregistrements peuvent contenir l’URL complète de Render.
  // On réutilise uniquement /uploads pour permettre le basculement vers un CDN
  // sans migration destructive de la base de données.
  if (/^(https?:)?\/\//i.test(cleanPath)) {
    try {
      const parsed = new URL(cleanPath, assetOrigin);
      if (parsed.pathname.startsWith('/uploads/')) return `${assetOrigin}${parsed.pathname}${parsed.search}`;
      return cleanPath;
    } catch {
      return cleanPath;
    }
  }
  if (/^(data:|blob:)/i.test(cleanPath)) return cleanPath;
  // L’API peut renvoyer /uploads/offers/file.webp, uploads/offers/file.webp
  // ou seulement offers/file.webp. On normalise les trois formes.
  const normalizedPath = cleanPath.startsWith('/uploads/')
    ? cleanPath
    : cleanPath.startsWith('uploads/')
      ? `/${cleanPath}`
      : `/uploads/${fallbackFolder ? `${fallbackFolder.replace(/^\/+|\/+$/g, '')}/` : ''}${cleanPath.replace(/^\/+/, '')}`;
  // En local, Next proxy /uploads. En production, un CDN explicite est utilisé.
  return configuredAssetOrigin && !/example\.com|localhost:4000/i.test(configuredAssetOrigin)
    ? `${assetOrigin}${normalizedPath}`
    : normalizedPath;
}

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

/**
 * Message d'erreur lisible pour l'utilisateur (voir lib/form-errors.ts).
 * Les erreurs serveur (500) et les messages techniques ne sont jamais affichés tels quels.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return friendlyErrorMessage(err, fallback);
}
