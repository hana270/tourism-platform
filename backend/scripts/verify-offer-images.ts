/**
 * Contrôle des images : chaque lien en base doit répondre en ligne (HTTP 200),
 * chaque catégorie doit avoir une couverture, chaque offre exactement une couverture.
 *   npm run images:verify
 *   npm run images:dedupe   (supprime en plus les photos en double d'une offre)
 */
import { prisma } from '../src/config/prisma';

async function reachable(url: string) {
  if (!/^https?:\/\//i.test(url)) return false; // ancien lien /uploads/... : cassé en ligne
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const repair = process.argv.includes('--repair-duplicates');
  let problems = 0;
  let checked = 0;
  const report = (message: string) => {
    problems += 1;
    console.error(message);
  };

  const categories = await prisma.category.findMany({ include: { images: true } });
  for (const category of categories) {
    if (category.images.length === 0) report(`Catégorie sans couverture :: ${category.name}`);
    if (category.images.length > 1) report(`Catégorie avec ${category.images.length} images (1 attendue) :: ${category.name}`);
    for (const image of category.images) {
      checked += 1;
      if (!(await reachable(image.mediumUrl || image.url))) report(`Catégorie image KO :: ${category.name} :: ${image.mediumUrl || image.url}`);
    }
  }

  const offers = await prisma.offer.findMany({ include: { photos: true }, orderBy: { createdAt: 'desc' } });
  let duplicated = 0;
  for (const offer of offers) {
    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    for (const photo of offer.photos) {
      if (seen.has(photo.url)) duplicateIds.push(photo.id);
      else seen.add(photo.url);
    }
    duplicated += duplicateIds.length;
    if (repair && duplicateIds.length) await prisma.offerPhoto.deleteMany({ where: { id: { in: duplicateIds } } });
    else if (duplicateIds.length) report(`Photos en double :: ${offer.name}`);

    const photos = offer.photos.filter((photo) => !duplicateIds.includes(photo.id));
    if (photos.length === 0) report(`Offre sans photo :: ${offer.name}`);
    else if (photos.filter((photo) => photo.isPrimary).length !== 1) report(`Offre sans couverture unique :: ${offer.name}`);
    for (const photo of photos) {
      checked += 1;
      if (!(await reachable(photo.url))) report(`Offre image KO :: ${offer.name} :: ${photo.url}`);
    }
  }

  console.log(`Catégories: ${categories.length}; offres: ${offers.length}; images testées: ${checked}; doublons: ${duplicated}; problèmes: ${problems}`);
  if (problems) process.exitCode = 1;
  else console.log('Toutes les images répondent en ligne.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
