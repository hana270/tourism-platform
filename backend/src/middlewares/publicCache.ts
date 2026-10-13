import { NextFunction, Request, Response } from 'express';

/**
 * Micro-cache mémoire pour les routes PUBLIQUES en lecture (offres, catégories, destinations, réglages).
 * Chaque appel à la base distante (Supabase) coûte ~0,3 à 1 s : une réponse déjà calculée est renvoyée en quelques ms.
 * - Seules les réponses 200 des requêtes GET sont mises en cache (clé = URL complète, donc langue et filtres inclus).
 * - Tout enregistrement réussi (POST/PATCH/PUT/DELETE) vide le cache : l'administrateur voit ses changements tout de suite.
 */
type Entry = { status: number; body: unknown; cacheControl?: string; expires: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;

export function clearPublicCache(): void {
  store.clear();
}

export function publicCache(ttlSeconds = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      if (hit.cacheControl) res.setHeader('Cache-Control', hit.cacheControl);
      res.status(hit.status).json(hit.body);
      return;
    }

    res.setHeader('X-Cache', 'MISS');
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200) {
        if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
        store.set(key, {
          status: 200,
          body,
          cacheControl: res.getHeader('Cache-Control') as string | undefined,
          expires: Date.now() + ttlSeconds * 1000,
        });
      }
      return json(body);
    };
    next();
  };
}

/** À monter une fois, avant les routes : vide le cache après toute modification réussie. */
export function invalidateOnWrite(req: Request, res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 400) clearPublicCache();
    });
  }
  next();
}
