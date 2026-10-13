const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, body: string, button?: { label: string; url: string }, footer?: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ece7d6">
<tr><td style="background:#ffc81e;padding:22px 32px;font-size:22px;font-weight:800;letter-spacing:.5px">IHOST</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(title)}</h1>
<div style="font-size:16px;line-height:1.65;color:#3d3a34">${body}</div>
${button ? `<p style="margin:28px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 28px;border-radius:12px">${esc(button.label)}</a></p>
<p style="font-size:13px;line-height:1.6;color:#6b675e">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><span style="word-break:break-all">${esc(button.url)}</span></p>` : ''}
${footer ? `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #ece7d6;font-size:13px;line-height:1.6;color:#6b675e">${footer}</p>` : ''}
</td></tr></table>
<p style="font-size:12px;color:#8a8579;margin:16px 0 0">Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.</p>
</td></tr></table></body></html>`;
}

export function resetPasswordEmail(opts: { name: string; url: string; minutes: number }) {
  const subject = 'Réinitialisez votre mot de passe IHOST';
  return {
    subject,
    html: layout(
      'Réinitialisation du mot de passe',
      `<p style="margin:0 0 12px">Bonjour ${esc(opts.name)},</p><p style="margin:0">Vous avez demandé à changer votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est valable <strong>${opts.minutes} minutes</strong> et ne peut être utilisé qu’une seule fois.</p>`,
      { label: 'Choisir un nouveau mot de passe', url: opts.url },
      '<strong>Vous n’êtes pas à l’origine de cette demande ?</strong> Ignorez simplement cet e-mail : votre mot de passe actuel reste inchangé.',
    ),
    text: `Bonjour ${opts.name},\n\nPour choisir un nouveau mot de passe IHOST (lien valable ${opts.minutes} minutes, usage unique) :\n${opts.url}\n\nVous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail.`,
  };
}

export function passwordChangedEmail(opts: { name: string; loginUrl: string }) {
  const subject = 'Votre mot de passe IHOST a été modifié';
  return {
    subject,
    html: layout(
      'Mot de passe modifié',
      `<p style="margin:0 0 12px">Bonjour ${esc(opts.name)},</p><p style="margin:0">Le mot de passe de votre compte a bien été modifié. Toutes vos sessions ont été fermées par sécurité.</p>`,
      { label: 'Me connecter', url: opts.loginUrl },
      '<strong>Ce n’était pas vous ?</strong> Réinitialisez immédiatement votre mot de passe et prévenez l’administrateur du site.',
    ),
    text: `Bonjour ${opts.name},\n\nVotre mot de passe IHOST a été modifié et vos sessions ont été fermées.\nConnexion : ${opts.loginUrl}\n\nCe n'était pas vous ? Réinitialisez-le immédiatement et prévenez l'administrateur.`,
  };
}
