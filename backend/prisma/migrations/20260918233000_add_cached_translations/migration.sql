-- Migration additive : les traductions sont conservées dans les mêmes tables métier.
-- Aucun enregistrement ni aucune table existante n'est supprimé.

ALTER TABLE "zones_geo"
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT;

ALTER TABLE "offres"
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT,
  ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
