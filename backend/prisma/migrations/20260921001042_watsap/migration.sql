-- AlterTable
ALTER TABLE "promotions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "reservations_offerId_startDate_endDate_idx" ON "reservations"("offerId", "startDate", "endDate");
