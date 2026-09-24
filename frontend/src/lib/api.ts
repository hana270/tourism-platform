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
  timeout: 8_000,
});

export function imageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const assetOrigin = (process.env.NEXT_PUBLIC_ASSET_ORIGIN ?? API_ORIGIN).replace(/\/$/, '');
  return `${assetOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
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