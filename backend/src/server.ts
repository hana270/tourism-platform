import { env } from '@/config/env';
import { createApp } from '@/app';
import { prisma } from '@/config/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 IHOST API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

// Connexion préparée au démarrage + ping régulier : évite la première requête
// lente (pooler Supabase qui s'endort) à l'origine des erreurs de délai dépassé.
prisma.$connect().catch((error) => console.error('Prisma connect failed:', error));
const keepAlive = setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch(() => undefined);
}, 4 * 60 * 1000);
keepAlive.unref();

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received. Shutting down gracefully...`);
  clearInterval(keepAlive);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
