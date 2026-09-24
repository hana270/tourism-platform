-- Migration additive et non destructive.
-- Les anciennes colonnes et tables sont conservées.

ALTER TABLE "zones_geo" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "offres" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "offres" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "offres" ADD COLUMN IF NOT EXISTS "addressEn" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'NOT_PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_PAID';

CREATE TABLE IF NOT EXISTS "availability_blocks" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reservationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "availability_blocks_offerId_startDate_endDate_idx"
  ON "availability_blocks"("offerId", "startDate", "endDate");

CREATE TABLE IF NOT EXISTS "promotions" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "oldPrice" DECIMAL(10,2) NOT NULL,
  "newPrice" DECIMAL(10,2) NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "promotions_offerId_startDate_endDate_status_idx"
  ON "promotions"("offerId", "startDate", "endDate", "status");

DO $$ BEGIN
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "promotions" ADD CONSTRAINT "promotions_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
