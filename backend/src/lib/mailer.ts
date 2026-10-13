import { env, isProduction } from '@/config/env';
import { smtpSend } from '@/lib/smtp';

export type MailResult = { sent: boolean; reason?: string };
type Mail = { to: string; subject: string; html: string; text: string };

/** « IHOST <no-reply@site.com> » → { name, email } */
function parseFrom(value: string) {
  const m = value.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  return m ? { name: (m[1] || 'IHOST').trim(), email: m[2].trim() } : { name: 'IHOST', email: value.trim() };
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<MailResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      return { sent: false, reason: `Fournisseur e-mail ${res.status}: ${raw.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'Erreur réseau e-mail.' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Envoi d'e-mail transactionnel via l'API HTTP de Brevo ou Resend (aucune dépendance).
 * En développement sans fournisseur : le lien est affiché dans la console du serveur.
 * Ne lève jamais d'exception : l'appelant décide quoi faire d'un échec.
 */
export async function sendMail(mail: Mail & { devLink?: string }): Promise<MailResult> {
  const from = env.MAIL_FROM ? parseFrom(env.MAIL_FROM) : null;

  if (from && env.BREVO_API_KEY) {
    return post('https://api.brevo.com/v3/smtp/email', { 'api-key': env.BREVO_API_KEY }, {
      sender: from,
      to: [{ email: mail.to }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    });
  }
  if (from && env.RESEND_API_KEY) {
    return post('https://api.resend.com/emails', { Authorization: `Bearer ${env.RESEND_API_KEY}` }, {
      from: `${from.name} <${from.email}>`,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  // SMTP classique (ex. Gmail) : seulement si aucune API HTTP n'est configurée.
  // Attention : Render bloque les ports SMTP sur l'offre gratuite — utiliser Brevo/Resend (HTTPS) en production gratuite.
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      const sender = from ?? { name: 'IHOST', email: env.SMTP_USER };
      await smtpSend(
        { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, pass: env.SMTP_PASS },
        { from: sender, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text },
      );
      return { sent: true };
    } catch (error) {
      return { sent: false, reason: error instanceof Error ? error.message : 'Erreur SMTP.' };
    }
  }

  if (!isProduction && mail.devLink) console.info(`[DEV] E-mail « ${mail.subject} » → ${mail.to}\n      ${mail.devLink}`);
  const reason = 'Aucun fournisseur e-mail configuré (BREVO_API_KEY, RESEND_API_KEY ou SMTP_HOST/SMTP_USER/SMTP_PASS).';
  if (isProduction) console.error(reason);
  return { sent: false, reason };
}
