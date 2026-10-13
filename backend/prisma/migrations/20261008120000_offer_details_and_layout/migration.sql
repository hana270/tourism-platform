-- Détails d'offre enrichis (hôtels, appartements, champs personnalisés typés)
ALTER TABLE "offres" ADD COLUMN IF NOT EXISTS "accommodationType" TEXT;
ALTER TABLE "offre_champs_personnalises" ADD COLUMN IF NOT EXISTS "fieldType" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "offre_champs_personnalises" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "offre_champs_personnalises" ADD COLUMN IF NOT EXISTS "groupName" TEXT;
ALTER TABLE "offre_champs_personnalises" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
