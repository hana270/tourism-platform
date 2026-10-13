'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_LAYOUT, LayoutSettings, SiteSettingsApi } from '@/lib/site-settings.api';

/** Cache module : un seul appel réseau partagé entre l'accueil, la navbar et la feuille de recherche mobile. */
let cached: LayoutSettings | null = null;
let pending: Promise<LayoutSettings> | null = null;

function load(): Promise<LayoutSettings> {
  if (cached) return Promise.resolve(cached);
  pending ??= SiteSettingsApi.layout()
    .then((v) => (cached = v))
    .catch(() => DEFAULT_LAYOUT)
    .finally(() => { pending = null; });
  return pending;
}

/** Disposition choisie par l'administrateur ; l'ordre par défaut s'affiche tant que la réponse n'est pas arrivée. */
export function useSiteLayout(): LayoutSettings {
  const [layout, setLayout] = useState<LayoutSettings>(cached ?? DEFAULT_LAYOUT);
  useEffect(() => {
    let alive = true;
    void load().then((v) => alive && setLayout(v));
    return () => { alive = false; };
  }, []);
  return layout;
}
