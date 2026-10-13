/**
 * Disponibilité : une offre à unité unique (studio, appartement, activité) est prise dès qu'une réservation
 * confirmée occupe la période. Un HÔTEL a plusieurs chambres : il n'est complet que si le nombre de réservations
 * confirmées simultanées atteint son nombre de chambres (roomCount). Sans roomCount, il n'est jamais « complet ».
 */
const DAY = 86_400_000;

export type Range = { startDate: Date; endDate: Date };
export type OccupancyOffer = { isHotel: boolean; roomCount: number | null };

export function isFull(offer: OccupancyOffer, blocks: Range[], start: Date, end: Date): boolean {
  const overlapping = blocks.filter((b) => b.startDate < end && b.endDate > start);
  if (overlapping.length === 0) return false;
  if (!offer.isHotel) return true;
  if (offer.roomCount == null) return false;
  const nights = Math.min(400, Math.max(1, Math.round((+end - +start) / DAY)));
  for (let i = 0; i < nights; i++) {
    const night = new Date(+start + i * DAY);
    const used = overlapping.filter((b) => b.startDate <= night && night < b.endDate).length;
    if (used >= offer.roomCount) return true;
  }
  return false;
}

/** Périodes à griser dans le calendrier public : nuits où l'offre est complète. */
export function fullRanges(offer: OccupancyOffer, blocks: Range[], from: Date, days = 540): Range[] {
  if (!offer.isHotel) return blocks.map((b) => ({ startDate: b.startDate, endDate: b.endDate }));
  if (offer.roomCount == null) return [];
  const out: Range[] = [];
  let open: Date | null = null;
  for (let i = 0; i < days; i++) {
    const night = new Date(+from + i * DAY);
    const used = blocks.filter((b) => b.startDate <= night && night < b.endDate).length;
    if (used >= offer.roomCount) {
      if (!open) open = night;
    } else if (open) {
      out.push({ startDate: open, endDate: night });
      open = null;
    }
  }
  if (open) out.push({ startDate: open, endDate: new Date(+from + days * DAY) });
  return out;
}
