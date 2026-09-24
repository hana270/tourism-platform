import { env } from '@/config/env';

export type WhatsAppResult = { sent: boolean; reason?: string };

/** Nom et langue du template approuvé dans Meta Business Manager. */
const TEMPLATE_NAME = 'nouvelle_reservation_admin';
const TEMPLATE_LANGUAGE = 'fr';

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

/**
 * Nettoie une valeur avant de l'envoyer comme variable de template.
 * Meta interdit les retours à la ligne/tabulations et plus de 4 espaces
 * consécutifs dans les variables ; une valeur vide devient "—".
 */
function sanitizeParam(value: string | null | undefined, maxLength = 300): string {
  const cleaned = (value ?? '')
    .replace(/[\r\n\t]+/g, ' — ')
    .replace(/ {5,}/g, '    ')
    .trim();

  if (!cleaned) return '—';
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

/**
 * Envoie une notification WhatsApp à l'administrateur via un template
 * pré-approuvé (obligatoire : ce message est envoyé par le serveur, sans
 * que l'admin n'ait écrit au préalable — un message texte libre serait
 * refusé par Meta en dehors de la fenêtre de service client de 24h).
 *
 * `params` doit contenir, dans l'ordre exact des variables {{1}}..{{n}}
 * définies dans le template Meta.
 */
export async function sendWhatsAppTemplate(
  to: string,
  params: (string | null | undefined)[],
): Promise<WhatsAppResult> {
  const recipient = normalizePhone(to);
  if (!recipient) return { sent: false, reason: 'Numéro WhatsApp admin non configuré.' };
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { sent: false, reason: 'WhatsApp Cloud API non configurée sur le serveur.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANGUAGE },
            components: [
              {
                type: 'body',
                parameters: params.map((value) => ({
                  type: 'text',
                  text: sanitizeParam(value),
                })),
              },
            ],
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      let reason = `WhatsApp API ${response.status}`;
      try {
        const parsed = JSON.parse(raw);
        const err = parsed?.error;
        if (err) {
          reason = `WhatsApp API ${response.status} — ${err.code ?? '?'} ${err.error_subcode ?? ''}: ${err.message ?? raw}`.trim();
        }
      } catch {
        if (raw) reason = `WhatsApp API ${response.status}: ${raw.slice(0, 300)}`;
      }
      console.error('WhatsApp Cloud API error:', reason);
      return { sent: false, reason };
    }

    return { sent: true };
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.name === 'AbortError'
          ? 'WhatsApp Cloud API : délai dépassé (timeout).'
          : error.message
        : 'Erreur réseau WhatsApp Cloud API.';
    console.error('WhatsApp Cloud API error:', reason);
    return { sent: false, reason };
  } finally {
    clearTimeout(timer);
  }
}