import { BadgePercent, Clock } from 'lucide-react';
import { urgencyLabel, daysLeft } from '@/lib/offer-price';

/** Pastille de remise : fond rouge profond (contraste AA avec le texte blanc). */
export function DiscountBadge({ pct, className = '' }: { pct: number; className?: string }) {
  if (pct <= 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--promo)] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm ${className}`}>
      <BadgePercent size={13} aria-hidden="true" /> −{pct}%
    </span>
  );
}

/** « Plus que 3 jours » : urgence honnête, basée sur la vraie date de fin. */
export function UrgencyTag({ endDate, className = '' }: { endDate: string; className?: string }) {
  const soon = daysLeft(endDate) <= 7;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${soon ? 'text-[var(--promo)]' : 'text-[var(--ink-soft)]'} ${className}`}>
      <Clock size={13} aria-hidden="true" /> {urgencyLabel(endDate)}
    </span>
  );
}
