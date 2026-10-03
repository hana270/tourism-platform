import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/config/prisma';
import { UPLOAD_ROOT } from '../src/lib/upload-storage';

async function main() {
  const repair = process.argv.includes('--repair-duplicates');
  const offers = await prisma.offer.findMany({ include: { photos: true }, orderBy: { createdAt: 'desc' } });
  let missing = 0;
  let duplicated = 0;
  let repaired = 0;
  for (const offer of offers) {
    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    for (const photo of offer.photos) {
      if (seen.has(photo.url)) duplicateIds.push(photo.id);
      else seen.add(photo.url);
    }
    duplicated += duplicateIds.length;
    if (repair && duplicateIds.length) {
      await prisma.offerPhoto.deleteMany({ where: { id: { in: duplicateIds } } });
      repaired += duplicateIds.length;
    }
    const urls = offer.photos.filter((photo) => !duplicateIds.includes(photo.id)).map((photo) => photo.url);
    for (const url of urls) {
      if (!url.startsWith('/uploads/')) continue;
      const relative = url.replace(/^\/uploads\//, '').split('/').map(decodeURIComponent);
      const file = path.join(UPLOAD_ROOT, ...relative);
      try { await fs.access(file); } catch { missing += 1; console.error(`Manquante :: ${offer.name} :: ${url}`); }
    }
  }
  console.log(`Offres vérifiées: ${offers.length}; images en double: ${duplicated}; fichiers manquants: ${missing}${repair ? `; doublons supprimés: ${repaired}` : ''}`);
  if ((duplicated && !repair) || missing) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
