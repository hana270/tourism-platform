import axios from 'axios';
import type { PaymentStatus, ReservationStatus } from '@/lib/operations.api';

/** Message renvoyé par le serveur (ex. conflit de dates) — sinon le texte de repli. */
export function serverMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const m = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (m && error.response && error.response.status < 500) return m;
  }
  return fallback;
}

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Client contacté',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  NOT_PAID: 'Non payé',
  PENDING: 'Paiement en cours',
  PAID: 'Payé',
};

/** Couleurs partagées entre la liste, le tiroir et le calendrier. */
export const STATUS_STYLE: Record<ReservationStatus, { badge: string; dot: string; chip: string }> = {
  PENDING: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    dot: 'bg-amber-500',
    chip: 'border-amber-300 bg-amber-100 text-amber-900 border-dashed',
  },
  CONTACTED: {
    badge: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
    dot: 'bg-sky-500',
    chip: 'border-sky-300 bg-sky-100 text-sky-900 border-dashed',
  },
  CONFIRMED: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    chip: 'border-emerald-600 bg-emerald-600 text-white',
  },
  COMPLETED: {
    badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
    dot: 'bg-slate-400',
    chip: 'border-slate-400 bg-slate-500 text-white',
  },
  CANCELLED: {
    badge: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    dot: 'bg-red-500',
    chip: 'border-red-300 bg-red-100 text-red-900',
  },
};

export const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  NOT_PAID: 'border-border bg-surface-alt text-ink-soft',
};

/** Palette d'offres : une couleur stable par offre pour les repérer d'un coup d'œil. */
const OFFER_COLORS = [
  { bar: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { bar: 'bg-rose-500', soft: 'bg-rose-50 text-rose-800 border-rose-200' },
  { bar: 'bg-teal-500', soft: 'bg-teal-50 text-teal-800 border-teal-200' },
  { bar: 'bg-orange-500', soft: 'bg-orange-50 text-orange-800 border-orange-200' },
  { bar: 'bg-violet-500', soft: 'bg-violet-50 text-violet-800 border-violet-200' },
  { bar: 'bg-cyan-500', soft: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { bar: 'bg-lime-600', soft: 'bg-lime-50 text-lime-800 border-lime-200' },
  { bar: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200' },
];

export function offerColor(offerId: string) {
  let h = 0;
  for (let i = 0; i < offerId.length; i++) h = (h * 31 + offerId.charCodeAt(i)) >>> 0;
  return OFFER_COLORS[h % OFFER_COLORS.length];
}

export function whatsappLink(phone: string, text?: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
