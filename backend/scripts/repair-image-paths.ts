import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/config/prisma';
import { UPLOAD_ROOT, uploadUrl } from '../src/lib/upload-storage';

type Candidate = { folderId?: string; base: string; files: Record<string, string>; mtimeMs: number };
const apply = process.argv.includes('--apply');

async function files(dir: string) {
  try { return await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
}

async function statTime(file: string) {
  try { return (await fs.stat(file)).mtimeMs; } catch { return 0; }
}

async function categoryCandidates(folderId?: string): Promise<Candidate[]> {
  const root = path.join(UPLOAD_ROOT, 'categories');
  const folders = folderId ? [folderId] : (await files(root)).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const result: Candidate[] = [];
  for (const currentFolder of folders) {
    const dir = path.join(root, currentFolder);
    const entries = await files(dir);
    const grouped = new Map<string, Candidate>();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.webp')) continue;
      const match = entry.name.match(/^(.*)-(thumbnail|medium|large)\.webp$/);
      if (!match) continue;
      const [, base, variant] = match;
      const full = path.join(dir, entry.name);
      const current = grouped.get(base) ?? { folderId: currentFolder, base, files: {}, mtimeMs: 0 };
      current.files[variant] = entry.name;
      current.mtimeMs = Math.max(current.mtimeMs, await statTime(full));
      grouped.set(base, current);
    }
    result.push(...[...grouped.values()].filter((candidate) => candidate.files.medium || candidate.files.large));
  }
  return result;
}

async function offerCandidates(): Promise<Candidate[]> {
  const dir = path.join(UPLOAD_ROOT, 'offers');
  const entries = await files(dir);
  const result: Candidate[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.webp')) continue;
    result.push({ base: entry.name, files: { file: entry.name }, mtimeMs: await statTime(path.join(dir, entry.name)) });
  }
  return result;
}

function nearest(candidates: Candidate[], createdAt: Date, used = new Set<string>()) {
  return [...candidates]
    .filter((candidate) => !used.has(`${candidate.folderId ?? 'offers'}/${candidate.base}`))
    .sort((a, b) => Math.abs(a.mtimeMs - +createdAt) - Math.abs(b.mtimeMs - +createdAt))[0];
}

async function main() {
  const changes: { table: string; id: string; from: string; to: string }[] = [];
  const usedCategory = new Set<string>();
  const allCategoryFiles = await categoryCandidates();
  const usedOffers = new Set<string>();

  const categoryImages = await prisma.categoryImage.findMany({ orderBy: { createdAt: 'asc' } });
  for (const image of categoryImages) {
    const categoryDir = await categoryCandidates(image.categoryId);
    const candidates = categoryDir.length ? categoryDir : allCategoryFiles;
    const firstUrl = image.mediumUrl || image.url;
    const exists = firstUrl.startsWith('/uploads/') && await fs.stat(path.join(UPLOAD_ROOT, firstUrl.replace(/^\/uploads\//, ''))).then(() => true).catch(() => false);
    if (exists) continue;
    const candidate = nearest(candidates, image.createdAt, usedCategory);
    if (!candidate) continue;
    usedCategory.add(`${candidate.folderId}/${candidate.base}`);
    const next = {
      url: uploadUrl('categories', candidate.folderId!, candidate.files.medium || candidate.files.large),
      thumbnailUrl: uploadUrl('categories', candidate.folderId!, candidate.files.thumbnail || candidate.files.medium || candidate.files.large),
      mediumUrl: uploadUrl('categories', candidate.folderId!, candidate.files.medium || candidate.files.large),
      largeUrl: uploadUrl('categories', candidate.folderId!, candidate.files.large || candidate.files.medium),
    };
    const previous: Record<string, string> = {
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      mediumUrl: image.mediumUrl,
      largeUrl: image.largeUrl,
    };
    for (const [field, to] of Object.entries(next)) changes.push({ table: `category_images.${field}`, id: image.id, from: previous[field], to });
    if (apply) await prisma.categoryImage.update({ where: { id: image.id }, data: next });
  }

  const offerFiles = await offerCandidates();
  const photos = await prisma.offerPhoto.findMany({ orderBy: { createdAt: 'asc' } });
  for (const photo of photos) {
    const exists = photo.url.startsWith('/uploads/') && await fs.stat(path.join(UPLOAD_ROOT, photo.url.replace(/^\/uploads\//, ''))).then(() => true).catch(() => false);
    if (exists) continue;
    const candidate = nearest(offerFiles, photo.createdAt, usedOffers);
    if (!candidate) continue;
    usedOffers.add(`offers/${candidate.base}`);
    const to = uploadUrl('offers', candidate.files.file);
    changes.push({ table: 'offre_photos.url', id: photo.id, from: photo.url, to });
    if (apply) await prisma.offerPhoto.update({ where: { id: photo.id }, data: { url: to } });
  }

  const settings = await prisma.siteSetting.findMany({ where: { key: { in: ['logo', 'photoCouverture'] } } });
  const settingFiles = await files(path.join(UPLOAD_ROOT, 'settings'));
  const settingCandidates = (await Promise.all(settingFiles.filter((f) => f.isFile() && f.name.endsWith('.webp')).map(async (f) => ({ name: f.name, mtimeMs: await statTime(path.join(UPLOAD_ROOT, 'settings', f.name)) })))).sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const setting of settings) {
    const exists = setting.value.startsWith('/uploads/') && await fs.stat(path.join(UPLOAD_ROOT, setting.value.replace(/^\/uploads\//, ''))).then(() => true).catch(() => false);
    if (exists || !settingCandidates[0]) continue;
    const to = uploadUrl('settings', settingCandidates[0].name);
    changes.push({ table: `site_settings.${setting.key}`, id: setting.key, from: setting.value, to });
    if (apply) await prisma.siteSetting.update({ where: { key: setting.key }, data: { value: to } });
  }

  console.table(changes);
  console.log(`${apply ? 'Applied' : 'Dry run'}: ${changes.length} image path changes.`);
  if (!apply && changes.length) console.log('Run: npm run images:repair -- --apply');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
