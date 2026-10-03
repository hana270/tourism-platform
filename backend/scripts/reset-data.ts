import { PrismaClient } from '@prisma/client';
import { removePrefix } from '../src/lib/storage';

const prisma = new PrismaClient();
const all = process.argv.includes('--all');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est obligatoire.');
  const tables = [
    'availability_blocks',
    'promotions',
    'reservations',
    'offre_photos',
    'offre_champs_personnalises',
    'offres',
    'category_images',
    'category_translations',
    'categories',
    'zones_geo',
    'audit_logs',
    // Ces trois modèles Prisma n'ont pas de @@map : PostgreSQL conserve donc
    // leurs noms exacts avec majuscules et guillemets.
    ...(all ? ['EmailToken', 'Session', 'site_settings', 'User'] : []),
  ];

  console.warn(`Réinitialisation destructive : ${tables.join(', ')}`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  for (const folder of ['offers', 'categories', 'profiles', 'settings']) await removePrefix(folder);

  console.log(all
    ? 'Toutes les données, comptes, réglages et médias ont été supprimés.'
    : 'Les données métier et leurs médias ont été supprimés ; les comptes et réglages sont conservés.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
