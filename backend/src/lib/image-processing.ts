import sharp from 'sharp';
import crypto from 'crypto';
import { deleteObjects, deleteStoredUrls, uploadObject } from './storage';

const VARIANTS = {
  thumbnail: { width: 480, height: 360, quality: 72 },
  medium: { width: 960, height: 720, quality: 82 },
  large: { width: 1800, height: 1350, quality: 86 },
} as const;

export type ImageVariants = {
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  url: string;
};

/**
 * Génère les 3 variantes WebP et les envoie dans Supabase Storage.
 * Chemin : <prefix>/<uuid>/<variante>.webp  (un dossier unique par image, donc
 * une URL toujours nouvelle : pas de problème de cache quand on remplace une image).
 */
async function writeVariants(buffer: Buffer, prefix: string): Promise<ImageVariants> {
  const id = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  try {
    const entries = await Promise.all(
      Object.entries(VARIANTS).map(async ([name, cfg]) => {
        const webp = await sharp(buffer, { limitInputPixels: 80_000_000 })
          .rotate()
          .resize(cfg.width, cfg.height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
          .webp({ quality: cfg.quality })
          .toBuffer();
        const objectPath = `${prefix}/${id}/${name}.webp`;
        uploadedPaths.push(objectPath);
        return [name, await uploadObject(objectPath, webp)] as const;
      }),
    );
    const urls = Object.fromEntries(entries) as Record<keyof typeof VARIANTS, string>;
    return { thumbnailUrl: urls.thumbnail, mediumUrl: urls.medium, largeUrl: urls.large, url: urls.medium };
  } catch (error) {
    await deleteObjects(uploadedPaths); // pas de fichiers à moitié envoyés
    throw error;
  }
}

export function processOfferImage(buffer: Buffer) {
  return writeVariants(buffer, 'offers');
}

export function processCategoryImage(buffer: Buffer, categoryId: string) {
  return writeVariants(buffer, `categories/${categoryId}`);
}

/** Supprime une image d'offre (les 3 variantes) à partir de son URL. */
export function deleteOfferImage(url: string) {
  return deleteStoredUrls([url]);
}
