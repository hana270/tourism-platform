import { api, ApiEnvelope } from './api';
export type ContactSettings = { whatsappNumero: string; telephone: string; email: string; adresse: string; facebook: string; instagram: string };
export type HomepageSettings = { logo: string; nomSite: string; photoCouverture: string; titreAccueil: string; sousTitre: string };

export type LayoutItem = { id: string; visible: boolean };
export type LayoutSettings = { sections: LayoutItem[]; searchFields: LayoutItem[] };
export const HOME_SECTION_IDS = ['trust', 'promotions', 'zones', 'categories', 'showcase', 'offers', 'contact'] as const;
export const SEARCH_FIELD_IDS = ['where', 'date', 'guests', 'zone', 'category'] as const;
export const HOME_SECTION_LABELS: Record<string, { label: string; hint: string }> = {
  trust: { label: 'Bandeau de confiance', hint: 'Réservation simple · sélection locale · équipe joignable' },
  promotions: { label: 'Offres spéciales (promotions)', hint: 'Offres en promotion mises en avant sur l’accueil (masquée s’il n’y en a aucune)' },
  zones: { label: 'Offres par destination', hint: 'Destinations avec offres en premier, puis les autres, et les offres de la destination choisie' },
  categories: { label: 'Catégories', hint: 'Hébergement, activités, escapades…' },
  showcase: { label: 'Sélection (carrousel)', hint: 'Carrousel des offres mises en avant' },
  offers: { label: 'Offres à découvrir', hint: 'Grille des offres publiées' },
  contact: { label: 'Bloc contact', hint: 'Appel à l’action « Une équipe pour vous accompagner »' },
};
export const SEARCH_FIELD_LABELS: Record<string, { label: string; hint: string }> = {
  where: { label: 'Barre de recherche', hint: 'Lieu, hôtel ou activité + suggestions' },
  date: { label: 'Dates', hint: 'Arrivée, départ, raccourcis week-end / 7 nuits' },
  guests: { label: 'Personnes', hint: 'Nombre de personnes' },
  zone: { label: 'Zones géographiques', hint: 'Choix rapide d’une zone' },
  category: { label: 'Catégories', hint: 'Choix rapide d’une catégorie' },
};
/** Ordre par défaut = ordre historique du site. */
export const DEFAULT_LAYOUT: LayoutSettings = {
  sections: HOME_SECTION_IDS.map((id) => ({ id, visible: true })),
  searchFields: SEARCH_FIELD_IDS.map((id) => ({ id, visible: true })),
};
/** Fusionne une valeur reçue avec les ids connus : jamais de doublon, jamais d'id manquant. */
export function normalizeLayout(raw: Partial<LayoutSettings> | null | undefined): LayoutSettings {
  const fix = (list: LayoutItem[] | undefined, ids: readonly string[]) => {
    const seen = new Set<string>();
    const out = (list ?? []).filter((i) => ids.includes(i.id) && !seen.has(i.id) && !!seen.add(i.id)).map((i) => ({ id: i.id, visible: i.visible !== false }));
    // Un nouvel id est inséré à sa place par défaut (après son voisin précédent), pas en fin de liste.
    ids.forEach((id, idx) => {
      if (seen.has(id)) return;
      const prev = ids.slice(0, idx).reverse().find((x) => out.some((i) => i.id === x));
      out.splice(prev ? out.findIndex((i) => i.id === prev) + 1 : 0, 0, { id, visible: true });
      seen.add(id);
    });
    return out;
  };
  return { sections: fix(raw?.sections, HOME_SECTION_IDS), searchFields: fix(raw?.searchFields, SEARCH_FIELD_IDS) };
}

export const SiteSettingsApi = {
  async layout() { const { data } = await api.get<ApiEnvelope<LayoutSettings>>('/settings/layout'); return normalizeLayout(data.data); },
  async saveLayout(value: LayoutSettings) { const { data } = await api.patch<ApiEnvelope<LayoutSettings>>('/settings/layout', value); return normalizeLayout(data.data); },
  async contact() { const { data } = await api.get<ApiEnvelope<ContactSettings>>('/settings/contact'); return data.data; },
  async saveContact(value: ContactSettings) { const { data } = await api.patch<ApiEnvelope<ContactSettings>>('/settings/contact', value); return data.data; },
  async homepage() { const { data } = await api.get<ApiEnvelope<HomepageSettings>>('/settings/homepage'); return data.data; },
  async saveHomepage(value: HomepageSettings) { const { data } = await api.patch<ApiEnvelope<HomepageSettings>>('/settings/homepage', value); return data.data; },
  async uploadImage(file: File) { const fd = new FormData(); fd.append('image', file); const { data } = await api.post<ApiEnvelope<{ url: string }>>('/settings/homepage/upload', fd); return data.data.url; },
};
