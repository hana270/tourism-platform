import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'categories');

const VARIANTS = {
  thumbnail: { width: 400, height: 300, quality: 70 },
  medium: { width: 800, height: 600, quality: 78 },
  large: { width: 1600, height: 1200, quality: 82 },
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

export async function processCategoryImage(
  buffer: Buffer,
  categoryId: string,
): Promise<ImageVariants> {
  const dir = path.join(UPLOAD_ROOT, categoryId);
  await ensureDir(dir);

  const fileId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const urls: Record<string, string> = {};

  for (const [name, cfg] of Object.entries(VARIANTS)) {
    const filename = `${fileId}-${name}.webp`;
    const filepath = path.join(dir, filename);

    await sharp(buffer)
      .rotate()
      .resize(cfg.width, cfg.height, { fit: 'cover', position: 'centre' })
      .webp({ quality: cfg.quality })
      .toFile(filepath);

    urls[name] = `/uploads/categories/${categoryId}/${filename}`;
  }

  return {
    thumbnailUrl: urls.thumbnail,
    mediumUrl: urls.medium,
    largeUrl: urls.large,
    url: urls.medium,
  };
}

export async function deleteCategoryImages(categoryId: string) {
  const dir = path.join(UPLOAD_ROOT, categoryId);
  await fs.rm(dir, { recursive: true, force: true });
}