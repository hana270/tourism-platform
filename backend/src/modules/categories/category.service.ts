import { prisma } from '@/config/prisma';
import { ApiError } from '@/utils/ApiError';
import { buildTranslations, makeSlug } from '@/lib/seo-translation';
import { processCategoryImage } from '@/lib/image-processing';
import { deleteStoredUrls } from '@/lib/storage';
import { audit } from '@/lib/audit';
import { CreateCategoryInput, UpdateCategoryInput } from './category.validation';

const categoryInclude = {
  translations: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  offers: { select: { id: true, name: true, price: true }, orderBy: { createdAt: 'desc' as const } },
};

function localize<T extends { translations: { locale: string; name: string; description: string | null }[] }>(category: T, locale: string) {
  const translation = category.translations.find((item) => item.locale === locale);
  if (!translation || locale === 'fr') return category;
  return { ...category, name: translation.name, description: translation.description };
}

export const CategoryService = {
  async list(locale = 'fr') {
    const rows = await prisma.category.findMany({
      include: categoryInclude,
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((category) => localize(category, locale));
  },

  async getById(id: string, locale = 'fr') {
    const category = await prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!category) throw ApiError.notFound('Catégorie introuvable');
    return localize(category, locale);
  },

  async create(input: CreateCategoryInput, files: Express.Multer.File[]) {
    const translations = await buildTranslations(input.name, input.description || null);

    const isActiveBoolean =
      typeof input.isActive === 'string'
        ? (input.isActive as string).toLowerCase() === 'true'
        : Boolean(input.isActive);

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: makeSlug(input.name),
        description: input.description || null,
        isActive: isActiveBoolean,
        displayOrder: input.displayOrder,
        translations: { create: translations },
      },
    });

    if (files?.length) {
        const variants = await processCategoryImage(files[0].buffer, category.id);
        await prisma.categoryImage.create({
          data: {
            categoryId: category.id,
            url: variants.url,
            thumbnailUrl: variants.thumbnailUrl,
            mediumUrl: variants.mediumUrl,
            largeUrl: variants.largeUrl,
            displayOrder: 0,
            altText: input.name,
          },
        });
    }

    return this.getById(category.id);
  },

  async update(id: string, input: UpdateCategoryInput, newFiles: Express.Multer.File[]) {
    const existing = await this.getById(id);

    // 1. Détection des changements de texte pour régénérer le SEO et les traductions FR/EN
    const newName = input.name ?? existing.name;
    const newDesc = input.description !== undefined ? input.description : existing.description;

    const hasNameChanged = input.name !== undefined && input.name !== existing.name;
    const hasDescChanged = input.description !== undefined && input.description !== existing.description;

    let translationsUpdate: Awaited<ReturnType<typeof buildTranslations>> | null = null;
    if (hasNameChanged || hasDescChanged) {
      translationsUpdate = await buildTranslations(newName, newDesc);
    }

    const isActiveBoolean =
      input.isActive !== undefined
        ? typeof input.isActive === 'string'
          ? (input.isActive as string).toLowerCase() === 'true'
          : Boolean(input.isActive)
        : undefined;

    // 2. Transaction Prisma pour la mise à jour des données
    await prisma.$transaction(async (tx) => {
      if (translationsUpdate) {
        for (const t of translationsUpdate) {
          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: id, locale: t.locale } },
            update: { name: t.name, slug: t.slug, description: t.description },
            create: { categoryId: id, ...t },
          });
        }
      }

      await tx.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.name !== undefined ? { slug: makeSlug(input.name) } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
          ...(isActiveBoolean !== undefined ? { isActive: isActiveBoolean } : {}),
          ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        },
      });

      // 3. Traitement des images conservées / supprimées
      if (input.keepImageIds !== undefined && input.keepImageIds.length > 0) {
        // L'interface actuelle ne gère qu'une couverture. Les images secondaires
        // déjà présentes restent intactes afin de ne pas supprimer la logique future.
        const coverId = input.keepImageIds[0];
        const coverExists = existing.images.some((img) => img.id === coverId);
        if (coverExists) {
          await tx.categoryImage.updateMany({
            where: { categoryId: id, id: { not: coverId } },
            data: { displayOrder: { increment: 1 } },
          });
          await tx.categoryImage.update({ where: { id: coverId }, data: { displayOrder: 0 } });
        }
      }
    });

    // 4. Nouvelle couverture : une catégorie n'a qu'UNE image (sa couverture).
    // Ordre sûr : 1) envoi de la nouvelle image, 2) remplacement en base,
    // 3) suppression des anciens fichiers. Si l'envoi échoue, l'ancienne image reste intacte.
    if (newFiles?.length) {
      const previous = await prisma.categoryImage.findMany({ where: { categoryId: id } });
      const variants = await processCategoryImage(newFiles[0].buffer, id);
      await prisma.$transaction([
        prisma.categoryImage.deleteMany({ where: { categoryId: id } }),
        prisma.categoryImage.create({
          data: {
            categoryId: id,
            url: variants.url,
            thumbnailUrl: variants.thumbnailUrl,
            mediumUrl: variants.mediumUrl,
            largeUrl: variants.largeUrl,
            displayOrder: 0,
            altText: newName,
          },
        }),
      ]);
      await deleteStoredUrls(previous.flatMap((img) => [img.url, img.thumbnailUrl, img.mediumUrl, img.largeUrl]));
    }

    return this.getById(id);
  },

  async remove(id: string, actorId?: string) {
    const category = await this.getById(id);
    const offerCount = await prisma.offer.count({ where: { categoryId: id } });
    if (offerCount > 0) {
      throw ApiError.conflict(`Cette catégorie contient ${offerCount} offre(s). Désactivez-la ou déplacez les offres avant toute suppression.`);
    }
    await prisma.category.delete({ where: { id } });
    await deleteStoredUrls(
      category.images.flatMap((img) => [img.url, img.thumbnailUrl, img.mediumUrl, img.largeUrl]),
    );
    await audit(actorId, 'DELETE', 'Category', id, { name: category.name });
  },
};
