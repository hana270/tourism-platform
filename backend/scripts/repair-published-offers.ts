import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/config/prisma';
import { UPLOAD_ROOT, uploadUrl } from '../src/lib/upload-storage';

const apply = process.argv.includes('--apply');

async function main() {
  const dir = path.join(UPLOAD_ROOT, 'offers');
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.webp')).map(async (entry) => ({
    name: entry.name,
    mtimeMs: (await fs.stat(path.join(dir, entry.name))).mtimeMs,
  })));
  if (!files.length) throw new Error(`Aucun fichier offre présent dans ${dir}`);

  const offers = await prisma.offer.findMany({
    where: { status: 'PUBLISHED' },
    include: { photos: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  const used = new Set<string>();
  let changes = 0;

  for (const offer of offers) {
    const valid = offer.photos.find((photo) => photo.url.startsWith('/uploads/') && files.some((file) => photo.url.endsWith(`/${file.name}`)));
    const reference = valid ?? offer.photos[0];
    if (!reference) continue;
    const candidate = [...files].filter((file) => !used.has(file.name)).sort((a, b) => Math.abs(a.mtimeMs - +reference.createdAt) - Math.abs(b.mtimeMs - +reference.createdAt))[0] ?? files[0];
    used.add(candidate.name);
    const fallback = valid?.url ?? uploadUrl('offers', candidate.name);

    for (const photo of offer.photos) {
      const exists = photo.url.startsWith('/uploads/') && files.some((file) => photo.url.endsWith(`/${file.name}`));
      if (exists) continue;
      changes += 1;
      console.log(`${offer.name} :: ${photo.url} -> ${fallback}`);
      if (apply) await prisma.offerPhoto.update({ where: { id: photo.id }, data: { url: fallback } });
    }
  }

  console.log(`${apply ? 'Applied' : 'Dry run'}: ${changes} published offer photo paths repaired.`);
  if (!apply && changes) console.log('Run: npm run images:repair:published -- --apply');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
