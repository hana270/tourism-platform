/*
  Warnings:

  - You are about to drop the column `image` on the `categories` table. All the data in the column will be lost.
  - Added the required column `name` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "image",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "category_images" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "mediumUrl" TEXT NOT NULL,
    "largeUrl" TEXT NOT NULL,
    "altText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_images_categoryId_displayOrder_idx" ON "category_images"("categoryId", "displayOrder");

-- AddForeignKey
ALTER TABLE "category_images" ADD CONSTRAINT "category_images_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
