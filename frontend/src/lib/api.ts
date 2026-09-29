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

export function imageUrl(path: string | null | undefined): string {
  if (!path) return '';
  const cleanPath = String(path).trim().replace(/\\/g, '/');
  const configuredAssetOrigin = process.env.NEXT_PUBLIC_ASSET_ORIGIN?.trim();
  const hasCdn = !!configuredAssetOrigin && !/example\.com|localhost:4000/i.test(configuredAssetOrigin);
  if (!hasCdn) {
    // URL absolue vers le backend local -> chemin relatif (servi via le proxy Next)
    const local = cleanPath.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.*)$/i);
    if (local) return local[1];
    if (cleanPath.startsWith('/uploads/')) return cleanPath;
  }
  if (/^(https?:|data:|blob:)/i.test(cleanPath)) return cleanPath;
  const assetOrigin = (
    configuredAssetOrigin && !/example\.com|localhost:4000/i.test(configuredAssetOrigin)
      ? configuredAssetOrigin
      : API_ORIGIN
  )
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
  return `${assetOrigin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
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
