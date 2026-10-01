ALTER TABLE "promotions" ADD COLUMN "priceType" TEXT NOT NULL DEFAULT 'BASE';
CREATE INDEX "promotions_offerId_priceType_startDate_endDate_idx" ON "promotions"("offerId", "priceType", "startDate", "endDate");
