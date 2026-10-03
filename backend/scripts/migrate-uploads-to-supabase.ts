/**
 * Migration UNIQUE des anciennes images (backend/uploads) vers Supabase Storage.
 *
 * À lancer sur la machine qui possède encore le dossier backend/uploads.
 *   npm run images:migrate            -> simulation (aucune écriture)
 *   npm run images:migrate -- --apply -> envoie les fichiers + met à jour la base
 *
 * Remplace en base les liens "/uploads/..." par les URLs publiques Supabase pour :
 *   category_images, offre_photos, site_settings (logo / couverture), User.profilePhoto.
 * Relançable sans risque (les liens déjà migrés sont ignorés).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/config/prisma';
import { UPLOAD_ROOT } from '../src/lib/upload-storage';
import { publicUrl, uploadObject } from '../src/lib/storage';

const apply = process.argv.includes('--apply');
const VARIANTS = ['thumbnail', 'medium', 'large'];
const cache = new Map<string, string | null>(); // chemin relatif -> URL publique (null = fichier absent)
const missing: string[] = [];
let uploaded = 0;
let rowsUpdated = 0;

/** Retourne le chemin relatif (ex: offers/<id>/medium.webp) si la valeur est un ancien lien local, sinon null. */
function legacyRelative(value: string | null | undefined): string | null {
  if (!value) return null;
  let v = value.trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(v)) {
    try {
      v = new URL(v).pathname;
    } catch {
      return null;
    }
    if (!v.startsWith('/uploads/')) return null; // URL externe ou déjà Supabase
  }
  try {
    v = decodeURIComponent(v);
  } catch {
    /* on garde la valeur telle quelle */
  }
  v = v.replace(/^\/+/, '');
  if (v.startsWith('uploads/')) v = v.slice('uploads/'.length);
  else if (!/^(offers|categories|settings|profiles)\//.test(v)) return null;
  if (!v || v.split('/').includes('..')) return null;
  return v;
}

function contentType(rel: string) {
  if (/\.png$/i.test(rel)) return 'image/png';
  if (/\.jpe?g$/i.test(rel)) return 'image/jpeg';
  return 'image/webp';
}

async function pushFile(rel: string): Promise<string | null> {
  if (cache.has(rel)) return cache.get(rel)!;
  let data: Buffer;
  try {
    data = await fs.readFile(path.join(UPLOAD_ROOT, ...rel.split('/')));
  } catch {
    cache.set(rel, null);
    return null;
  }
  if (apply) await uploadObject(rel, data, contentType(rel));
  uploaded += 1;
  const url = publicUrl(rel);
  cache.set(rel, url);
  return url;
}

/** Migre un lien (et les variantes sœurs) ; retourne la nouvelle URL, ou null si rien à faire / fichier absent. */
async function migrate(value: string | null | undefined, label: string): Promise<string | null> {
  const rel = legacyRelative(value);
  if (!rel) return null;
  const url = await pushFile(rel);
  if (!url) {
    missing.push(`${label} :: ${value}`);
    return null;
  }
  const match = rel.match(/^(.*)\/(thumbnail|medium|large)\.webp$/);
  if (match) for (const v of VARIANTS) await pushFile(`${match[1]}/${v}.webp`);
  return url;
}

async function main() {
  console.log(apply ? 'MODE APPLY : envoi + mise à jour de la base' : 'MODE SIMULATION (ajoutez --apply pour écrire)');
  console.log(`Dossier source : ${UPLOAD_ROOT}\n`);

  // 1) Catégories : une seule couverture
  for (const image of await prisma.categoryImage.findMany()) {
    const fields = { url: image.url, thumbnailUrl: image.thumbnailUrl, mediumUrl: image.mediumUrl, largeUrl: image.largeUrl };
    const next: Record<string, string> = {};
    const resolved: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(fields)) resolved[key] = await migrate(value, `Catégorie ${image.categoryId} (${key})`);
    const fallback = resolved.mediumUrl || resolved.largeUrl || resolved.url || resolved.thumbnailUrl;
    for (const key of Object.keys(fields)) {
      const value = resolved[key] ?? (legacyRelative(fields[key as keyof typeof fields]) ? fallback : null);
      if (value) next[key] = value;
    }
    if (Object.keys(next).length) {
      rowsUpdated += 1;
      if (apply) await prisma.categoryImage.update({ where: { id: image.id }, data: next });
    }
  }

  // 2) Offres : plusieurs images, une couverture
  for (const photo of await prisma.offerPhoto.findMany()) {
    const url = await migrate(photo.url, `Offre ${photo.offerId}`);
    if (url) {
      rowsUpdated += 1;
      if (apply) await prisma.offerPhoto.update({ where: { id: photo.id }, data: { url } });
    }
  }

  // 3) Logo et photo de couverture de l'accueil
  for (const setting of await prisma.siteSetting.findMany({ where: { key: { in: ['logo', 'photoCouverture'] } } })) {
    const url = await migrate(setting.value, `Réglage ${setting.key}`);
    if (url) {
      rowsUpdated += 1;
      if (apply) await prisma.siteSetting.update({ where: { id: setting.id }, data: { value: url } });
    }
  }

  // 4) Photos de profil
  for (const user of await prisma.user.findMany({ where: { profilePhoto: { not: null } }, select: { id: true, email: true, profilePhoto: true } })) {
    const url = await migrate(user.profilePhoto, `Profil ${user.email}`);
    if (url) {
      rowsUpdated += 1;
      if (apply) await prisma.user.update({ where: { id: user.id }, data: { profilePhoto: url } });
    }
  }

  console.log(`Fichiers ${apply ? 'envoyés' : 'à envoyer'} : ${uploaded}`);
  console.log(`Lignes ${apply ? 'mises à jour' : 'à mettre à jour'} : ${rowsUpdated}`);
  if (missing.length) {
    console.warn(`\n${missing.length} image(s) référencée(s) en base mais ABSENTE(S) du dossier local (à ré-uploader depuis l'admin) :`);
    for (const line of missing) console.warn(`  - ${line}`);
  }
  if (!apply) console.log('\nRelancez avec : npm run images:migrate -- --apply');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
