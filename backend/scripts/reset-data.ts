import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

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
    ...(all ? ['email_tokens', 'sessions', 'site_settings', 'users'] : []),
  ];

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );

  for (const directory of ['offers', 'categories']) {
    await fs.rm(path.join(process.cwd(), 'uploads', directory), { recursive: true, force: true });
  }

  console.log(all
    ? 'Toutes les données, comptes et réglages ont été supprimés.'
    : 'Les données métier ont été supprimées ; les comptes et réglages sont conservés.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
