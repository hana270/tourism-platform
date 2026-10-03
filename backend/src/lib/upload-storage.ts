import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Répertoire persistant des uploads.
 * Sur Render, définir UPLOAD_DIR vers un disque persistant monté, par exemple
 * /var/data/uploads. En local, le fallback reste backend/uploads.
 */
export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
);

export function uploadPath(...parts: string[]) {
  const candidate = path.resolve(UPLOAD_ROOT, ...parts);
  if (candidate !== UPLOAD_ROOT && !candidate.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Chemin upload invalide.');
  }
  return candidate;
}

export function uploadUrl(...parts: string[]) {
  return `/uploads/${parts.map((part) => encodeURIComponent(part)).join('/')}`;
}

export async function ensureUploadDir(...parts: string[]) {
  const dir = uploadPath(...parts);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Supprime un média uniquement s'il appartient bien au répertoire des uploads. */
export async function removeUploadPath(...parts: string[]) {
  await fs.rm(uploadPath(...parts), { recursive: true, force: true });
}

/** Efface tous les répertoires médias lors d'une réinitialisation complète. */
export async function resetUploadDirectories() {
  for (const directory of ['offers', 'categories', 'profiles', 'settings']) {
    await removeUploadPath(directory);
  }
}
