import fs from 'fs/promises';
import sharp from 'sharp';
import crypto from 'crypto';
import { uploadPath, uploadUrl } from './upload-storage';

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

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeVariants(buffer: Buffer, folder: string, id: string = crypto.randomUUID()): Promise<ImageVariants> {
  const dir = uploadPath(folder, id);
  await ensureDir(dir);
  const urls: Record<string, string> = {};

  for (const [name, cfg] of Object.entries(VARIANTS)) {
    const filename = `${name}.webp`;
    await sharp(buffer, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(cfg.width, cfg.height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
      .webp({ quality: cfg.quality })
      .toFile(uploadPath(folder, id, filename));
    urls[name] = uploadUrl(folder, id, filename);
  }

  return {
    thumbnailUrl: urls.thumbnail,
    mediumUrl: urls.medium,
    largeUrl: urls.large,
    url: urls.medium,
  };
}

export function processOfferImage(buffer: Buffer) {
  return writeVariants(buffer, 'offers');
}

export function processCategoryImage(buffer: Buffer, categoryId: string) {
  return writeVariants(buffer, 'categories', categoryId);
}

export async function deleteOfferImage(url: string) {
  const normalized = url.replace(/^\/uploads\//, '').split('/').map(decodeURIComponent);
  if (normalized[0] !== 'offers' || normalized.length < 3) return;
  await fs.rm(uploadPath('offers', normalized[1]), { recursive: true, force: true });
}

export async function deleteCategoryImages(categoryId: string) {
  await fs.rm(uploadPath('categories', categoryId), { recursive: true, force: true });
}
