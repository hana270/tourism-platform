-- Convert legacy drafts before removing the enum value.
UPDATE "offres" SET "status" = 'PUBLISHED' WHERE "status" = 'DRAFT';

ALTER TYPE "OfferStatus" RENAME TO "OfferStatus_old";
CREATE TYPE "OfferStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');

ALTER TABLE "offres" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "offres"
  ALTER COLUMN "status" TYPE "OfferStatus"
  USING "status"::text::"OfferStatus";
ALTER TABLE "offres" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

DROP TYPE "OfferStatus_old";
