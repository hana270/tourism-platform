import {
  BedDouble, Building2, Bike, Camera, Car, Coffee, Compass, Dumbbell, Gem, Landmark,
  Mountain, Music, Plane, Sailboat, ShoppingBag, Sparkles, Sun, Tent, Utensils,
  Waves, Wine, type LucideIcon,
} from 'lucide-react';

/**
 * Icônes proposées à l'admin (clé stockée en base dans category.icon).
 * Pour en ajouter une : l'importer ci-dessus puis l'ajouter ici. C'est tout.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  hotel: BedDouble,
  building: Building2,
  restaurant: Utensils,
  cafe: Coffee,
  bar: Wine,
  beach: Waves,
  palm: Sun,
  boat: Sailboat,
  mountain: Mountain,
  camp: Tent,
  bike: Bike,
  car: Car,
  plane: Plane,
  culture: Landmark,
  photo: Camera,
  music: Music,
  sport: Dumbbell,
  spa: Sparkles,
  shop: ShoppingBag,
  luxury: Gem,
  explore: Compass,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

/** Repli automatique : devine l'icône d'après le nom (FR / EN / AR). */
const KEYWORDS: [RegExp, string][] = [
  [/h[ôo]tel|h[ée]berg|villa|maison|riad|logement|appart|hostel|resort|فندق|إقامة/i, 'hotel'],
  [/caf[ée]|coffee|salon de th[ée]|قهوة|مقهى/i, 'cafe'],
  [/restau|cuisine|gastro|food|manger|مطعم/i, 'restaurant'],
  [/bar\b|lounge|club|soir[ée]e|nightlife/i, 'bar'],
  [/plage|mer\b|nautique|beach|jet|snorkel|plong|شاطئ/i, 'beach'],
  [/bateau|croisi|voilier|boat|yacht|sailing/i, 'boat'],
  [/d[ée]sert|montagne|rando|nature|quad|trek|hike|صحراء/i, 'mountain'],
  [/camp|bivouac|glamping/i, 'camp'],
  [/v[ée]lo|bike|cycl/i, 'bike'],
  [/voiture|transport|location|transfert|taxi|car\b/i, 'car'],
  [/vol|avion|flight|billet/i, 'plane'],
  [/culture|mus[ée]e|histoire|patrimoine|visite|guide|tour\b|متحف/i, 'culture'],
  [/photo|shooting|vid[ée]o/i, 'photo'],
  [/musique|concert|festival|spectacle|show/i, 'music'],
  [/sport|fitness|golf|padel|tennis|yoga/i, 'sport'],
  [/spa|hammam|massage|bien-?[êe]tre|thalasso/i, 'spa'],
  [/shop|boutique|artisan|souk|march[ée]/i, 'shop'],
  [/luxe|vip|premium/i, 'luxury'],
];

/**
 * Ordre de priorité :
 *  1. l'icône choisie par l'admin (category.icon)
 *  2. une icône devinée d'après le nom
 *  3. la boussole (neutre) — jamais d'erreur si l'admin crée une catégorie inconnue
 */
export function categoryIcon(name: string, icon?: string | null): LucideIcon {
  if (icon && CATEGORY_ICONS[icon]) return CATEGORY_ICONS[icon];
  const key = KEYWORDS.find(([re]) => re.test(name))?.[1];
  return (key && CATEGORY_ICONS[key]) || Compass;
}
