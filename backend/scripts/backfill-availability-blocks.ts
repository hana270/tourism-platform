/**
 * Nouvelle règle : une réservation CONFIRMÉE bloque ses dates (le paiement
 * n'est plus requis). Ce script crée les blocages manquants pour les
 * réservations déjà confirmées avant ce changement.
 *
 *   npm run bookings:backfill            # simulation
 *   npm run bookings:backfill -- --apply # applique
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.reservation.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startDate: { not: null },
      endDate: { not: null },
      availabilityBlocks: { none: {} },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${rows.length} réservation(s) confirmée(s) sans blocage.`);
  let created = 0;
  for (const r of rows) {
    const clash = await prisma.availabilityBlock.findFirst({
      where: { offerId: r.offerId, startDate: { lt: r.endDate! }, endDate: { gt: r.startDate! } },
    });
    if (clash) {
      console.log(`⚠ Conflit ignoré : ${r.customerName} (${r.id}) chevauche un autre blocage — à traiter à la main.`);
      continue;
    }
    console.log(`${apply ? "+" : "(simulation)"} ${r.customerName} ${r.startDate!.toISOString().slice(0, 10)} → ${r.endDate!.toISOString().slice(0, 10)}`);
    if (apply) {
      await prisma.availabilityBlock.create({
        data: { offerId: r.offerId, startDate: r.startDate!, endDate: r.endDate!, reservationId: r.id },
      });
      created++;
    }
  }
  console.log(apply ? `${created} blocage(s) créé(s).` : "Aucune modification (ajoutez --apply).");
}

main().finally(() => prisma.$disconnect());
