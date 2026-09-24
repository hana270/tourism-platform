/*
  Warnings:

  - You are about to drop the `offer_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `offer_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `offers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "offer_images" DROP CONSTRAINT "offer_images_offerId_fkey";

-- DropForeignKey
ALTER TABLE "offer_translations" DROP CONSTRAINT "offer_translations_offerId_fkey";

-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_offerId_fkey";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "slug" TEXT NOT NULL;

-- DropTable
DROP TABLE "offer_images";

-- DropTable
DROP TABLE "offer_translations";

-- DropTable
DROP TABLE "offers";

-- DropEnum
DROP TYPE "OfferType";

-- CreateTable
CREATE TABLE "zones_geo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_geo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offres" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "zoneId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'par personne',
    "isHotel" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'PUBLISHED',
    "availabilityOnDemand" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER,
    "simplePrice" DECIMAL(10,2),
    "halfBoardPrice" DECIMAL(10,2),
    "allInclusivePrice" DECIMAL(10,2),
    "fullBoardPrice" DECIMAL(10,2),
    "address" TEXT,
    "googleMapsUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_photos" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offre_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_champs_personnalises" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "offre_champs_personnalises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_geo_slug_key" ON "zones_geo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "offres_slug_key" ON "offres"("slug");

-- CreateIndex
CREATE INDEX "offres_categoryId_status_createdAt_idx" ON "offres"("categoryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "offres_zoneId_status_idx" ON "offres"("zoneId", "status");

-- CreateIndex
CREATE INDEX "offre_photos_offerId_isPrimary_idx" ON "offre_photos"("offerId", "isPrimary");

-- CreateIndex
CREATE INDEX "offre_champs_personnalises_offerId_idx" ON "offre_champs_personnalises"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- AddForeignKey
ALTER TABLE "offres" ADD CONSTRAINT "offres_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres" ADD CONSTRAINT "offres_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones_geo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_photos" ADD CONSTRAINT "offre_photos_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_champs_personnalises" ADD CONSTRAINT "offre_champs_personnalises_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
