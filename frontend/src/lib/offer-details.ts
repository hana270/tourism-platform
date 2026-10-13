import {
  Armchair, Bath, BedDouble, Car, Clock, Coffee, Dumbbell, KeyRound, Link2, ListChecks, PawPrint, Ruler, ShieldCheck,
  Snowflake, Sparkles, Tv, Users, UtensilsCrossed, Waves, Wifi, Flame, Sun, Building2, Bus, type LucideIcon,
} from 'lucide-react';
import type { AccommodationType, FieldType, OfferCustomField } from '@/types/offer';

/** Registre d'icônes : la base ne stocke que la clé (ex. "wifi"). */
export const FIELD_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  list: { label: 'Liste', Icon: ListChecks },
  wifi: { label: 'Wi-Fi', Icon: Wifi },
  parking: { label: 'Parking', Icon: Car },
  pool: { label: 'Piscine', Icon: Waves },
  restaurant: { label: 'Restauration', Icon: UtensilsCrossed },
  breakfast: { label: 'Petit-déjeuner', Icon: Coffee },
  aircon: { label: 'Climatisation', Icon: Snowflake },
  heating: { label: 'Chauffage', Icon: Flame },
  tv: { label: 'Télévision', Icon: Tv },
  bed: { label: 'Chambres / lits', Icon: BedDouble },
  bath: { label: 'Salle de bain', Icon: Bath },
  surface: { label: 'Surface', Icon: Ruler },
  guests: { label: 'Personnes', Icon: Users },
  key: { label: 'Arrivée / clés', Icon: KeyRound },
  clock: { label: 'Horaires', Icon: Clock },
  pets: { label: 'Animaux', Icon: PawPrint },
  gym: { label: 'Sport / spa', Icon: Dumbbell },
  safety: { label: 'Sécurité', Icon: ShieldCheck },
  view: { label: 'Vue / balcon', Icon: Sun },
  furniture: { label: 'Mobilier', Icon: Armchair },
  building: { label: 'Immeuble', Icon: Building2 },
  shuttle: { label: 'Navette', Icon: Bus },
  special: { label: 'Atout', Icon: Sparkles },
  link: { label: 'Lien', Icon: Link2 },
};
export const iconFor = (key?: string | null): LucideIcon => (key && FIELD_ICONS[key]?.Icon) || ListChecks;

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: 'TEXT', label: 'Texte', hint: 'Une information libre (ex. Arrivée dès 15 h)' },
  { value: 'NUMBER', label: 'Nombre', hint: 'Une valeur chiffrée (ex. 2 chambres)' },
  { value: 'BOOLEAN', label: 'Oui / Non', hint: 'Un équipement présent ou non' },
  { value: 'LIST', label: 'Liste', hint: 'Éléments séparés par des virgules' },
  { value: 'LINK', label: 'Lien', hint: 'Adresse web (https://…)' },
];

export const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: 'HOTEL', label: 'Hôtel' },
  { value: 'APARTMENT', label: 'Appartement' },
  { value: 'VILLA', label: 'Villa / maison' },
  { value: 'GUESTHOUSE', label: "Maison d'hôtes" },
  { value: 'OTHER', label: 'Autre hébergement' },
];
export const accommodationLabel = (t?: string | null) => ACCOMMODATION_TYPES.find((a) => a.value === t)?.label ?? null;

export type FieldDraft = { fieldName: string; value: string; fieldType: FieldType; icon: string; groupName: string };
const f = (fieldName: string, fieldType: FieldType, icon: string, groupName: string, value = ''): FieldDraft => ({ fieldName, fieldType, icon, groupName, value });

/** Modèles proposés à l'admin selon le type d'hébergement (un clic ajoute les champs manquants). */
export const TEMPLATES: Record<string, { label: string; fields: FieldDraft[] }> = {
  HOTEL: {
    label: 'Hôtel',
    fields: [
      f('Arrivée (check-in)', 'TEXT', 'key', 'Séjour', 'À partir de 15 h'),
      f('Départ (check-out)', 'TEXT', 'clock', 'Séjour', "Jusqu'à 12 h"),
      f('Types de chambres', 'LIST', 'bed', 'Séjour', 'Standard, Supérieure, Suite'),
      f('Restauration', 'LIST', 'restaurant', 'Séjour', 'Restaurant, Bar'),
      f('Piscine', 'BOOLEAN', 'pool', 'Équipements', 'true'),
      f('Wi-Fi gratuit', 'BOOLEAN', 'wifi', 'Équipements', 'true'),
      f('Parking', 'BOOLEAN', 'parking', 'Équipements', 'true'),
      f('Climatisation', 'BOOLEAN', 'aircon', 'Équipements', 'true'),
      f('Spa / salle de sport', 'BOOLEAN', 'gym', 'Équipements', 'false'),
      f('Navette aéroport', 'BOOLEAN', 'shuttle', 'Services', 'false'),
      f('Animaux acceptés', 'BOOLEAN', 'pets', 'Conditions', 'false'),
    ],
  },
  APARTMENT: {
    label: 'Appartement',
    fields: [
      f('Chambres', 'NUMBER', 'bed', 'Logement', '1'),
      f('Lits', 'NUMBER', 'bed', 'Logement', '2'),
      f('Salles de bain', 'NUMBER', 'bath', 'Logement', '1'),
      f('Surface (m²)', 'NUMBER', 'surface', 'Logement', '50'),
      f('Étage', 'TEXT', 'building', 'Logement', ''),
      f('Cuisine équipée', 'BOOLEAN', 'restaurant', 'Équipements', 'true'),
      f('Wi-Fi', 'BOOLEAN', 'wifi', 'Équipements', 'true'),
      f('Climatisation', 'BOOLEAN', 'aircon', 'Équipements', 'true'),
      f('Télévision', 'BOOLEAN', 'tv', 'Équipements', 'true'),
      f('Balcon / terrasse', 'BOOLEAN', 'view', 'Équipements', 'false'),
      f('Parking', 'BOOLEAN', 'parking', 'Équipements', 'false'),
      f('Ascenseur', 'BOOLEAN', 'building', 'Équipements', 'false'),
      f('Arrivée autonome', 'TEXT', 'key', 'Séjour', 'Boîte à clés'),
      f('Animaux acceptés', 'BOOLEAN', 'pets', 'Conditions', 'false'),
    ],
  },
  VILLA: {
    label: 'Villa / maison',
    fields: [
      f('Chambres', 'NUMBER', 'bed', 'Logement', '3'),
      f('Salles de bain', 'NUMBER', 'bath', 'Logement', '2'),
      f('Surface (m²)', 'NUMBER', 'surface', 'Logement', '120'),
      f('Piscine privée', 'BOOLEAN', 'pool', 'Équipements', 'true'),
      f('Jardin / terrasse', 'BOOLEAN', 'view', 'Équipements', 'true'),
      f('Parking', 'BOOLEAN', 'parking', 'Équipements', 'true'),
      f('Wi-Fi', 'BOOLEAN', 'wifi', 'Équipements', 'true'),
      f('Climatisation', 'BOOLEAN', 'aircon', 'Équipements', 'true'),
      f('Animaux acceptés', 'BOOLEAN', 'pets', 'Conditions', 'false'),
    ],
  },
  GENERIC: {
    label: 'Général',
    fields: [
      f('Durée', 'TEXT', 'clock', 'Informations pratiques'),
      f('Point de rendez-vous', 'TEXT', 'key', 'Informations pratiques'),
      f('Inclus', 'LIST', 'special', 'Informations pratiques'),
    ],
  },
};
export const templateFor = (type?: string | null, isHotel?: boolean) =>
  TEMPLATES[type && TEMPLATES[type] ? type : isHotel ? 'HOTEL' : 'GENERIC'];

/* ---------- Lecture / formatage ---------- */
export const isTrue = (v: string) => ['true', 'oui', 'yes', '1'].includes(v.trim().toLowerCase());
export const splitList = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

/** Texte brut d'une valeur (réservation WhatsApp, résumés). */
export function plainValue(field: Pick<OfferCustomField, 'value' | 'fieldType'>): string {
  switch (field.fieldType) {
    case 'BOOLEAN': return isTrue(field.value) ? 'Oui' : 'Non';
    case 'LIST': return splitList(field.value).join(', ');
    default: return field.value;
  }
}

export const DEFAULT_GROUP = 'Informations pratiques';

/** Regroupe les champs en gardant l'ordre saisi par l'admin (premier passage = ordre des groupes). */
export function groupFields(fields: OfferCustomField[]) {
  const groups = new Map<string, OfferCustomField[]>();
  [...fields].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach((fd) => {
    const key = fd.groupName?.trim() || DEFAULT_GROUP;
    groups.set(key, [...(groups.get(key) ?? []), fd]);
  });
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

/** Chiffres clés affichés en bandeau (champs NOMBRE avec une icône logement). */
export const KEY_FACT_ICONS = new Set(['bed', 'bath', 'surface', 'guests']);
