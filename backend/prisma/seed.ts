import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters and must be provided only at seed time.');
  await prisma.user.upsert({ where: { email }, update: { role: 'ADMIN', status: 'ACTIVE', emailVerifiedAt: new Date() }, create: { email, passwordHash: await bcrypt.hash(password, 12), firstName: 'Site', lastName: 'Administrator', role: 'ADMIN', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  await prisma.siteSetting.upsert({ where: { key: 'whatsapp_number' }, update: {}, create: { key: 'whatsapp_number', value: '' } });
  console.log(`Admin seed completed for ${email}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
