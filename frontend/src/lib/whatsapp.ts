/**
 * Diagnostic autonome pour l'envoi WhatsApp — n'a rien à voir avec une réservation.
 *
 * Usage :
 *   cd backend
 *   npx tsx src/scripts/test-whatsapp.ts +21620000000
 *
 * (remplacez par le numéro admin réel, au format international avec ou sans "+")
 */
import { env } from '@/config/env';
import { sendWhatsAppAdminNotification } from '@/lib/whatsapp';

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx tsx src/scripts/test-whatsapp.ts <numero_admin>');
    process.exit(1);
  }

  console.log('--- Configuration ---');
  console.log('WHATSAPP_ACCESS_TOKEN   :', env.WHATSAPP_ACCESS_TOKEN ? `défini (${env.WHATSAPP_ACCESS_TOKEN.length} caractères)` : '❌ ABSENT');
  console.log('WHATSAPP_PHONE_NUMBER_ID:', env.WHATSAPP_PHONE_NUMBER_ID ?? '❌ ABSENT');
  console.log('WHATSAPP_GRAPH_VERSION  :', env.WHATSAPP_GRAPH_VERSION);
  console.log('Destinataire testé      :', to);
  console.log('');

  const result = await sendWhatsAppAdminNotification(to, 'Test IHOST — ceci est un message de diagnostic.');

  console.log('--- Résultat ---');
  console.log(result);

  if (!result.sent) {
    console.log('');
    console.log('Causes les plus fréquentes si ça échoue encore :');
    console.log('1. Token expiré (les tokens de test Meta durent 24h — il faut un token permanent / System User).');
    console.log('2. Le destinataire n\'a jamais écrit au numéro WhatsApp Business dans les dernières 24h');
    console.log('   → hors de cette fenêtre, un message texte libre est refusé, il faut un Message Template approuvé.');
    console.log('3. En mode test/sandbox Meta, seuls les numéros ajoutés comme "testeurs" peuvent recevoir des messages.');
  }
  process.exit(result.sent ? 0 : 1);
}

main();