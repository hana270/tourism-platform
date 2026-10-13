import net from 'net';
import tls from 'tls';
import os from 'os';
import crypto from 'crypto';

/**
 * Client SMTP minimal (sans dépendance) : STARTTLS (587) ou TLS direct (465), authentification PLAIN/LOGIN.
 * Suffisant pour des e-mails transactionnels (Gmail, Outlook, OVH, serveur du client…).
 * Les identifiants viennent UNIQUEMENT des variables d'environnement.
 */
export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Tests uniquement : accepter un certificat auto-signé. */
  allowSelfSigned?: boolean;
  timeoutMs?: number;
};
export type SmtpMessage = {
  from: { name: string; email: string };
  to: string;
  subject: string;
  html: string;
  text: string;
};

const CRLF = '\r\n';
const b64 = (v: string) => Buffer.from(v, 'utf8').toString('base64');
const wrap76 = (v: string) => v.replace(/.{1,76}/g, '$&' + CRLF).trimEnd();
/** Empêche toute injection d'en-têtes (retours à la ligne) dans les champs fournis par un utilisateur. */
const clean = (v: string) => v.replace(/[\r\n]+/g, ' ').trim();
const encodeHeader = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export function buildMime(msg: SmtpMessage, domain: string): string {
  const boundary = `ihost_${crypto.randomBytes(12).toString('hex')}`;
  const fromName = clean(msg.from.name);
  const headers = [
    `From: ${encodeHeader(fromName)} <${clean(msg.from.email)}>`,
    `To: <${clean(msg.to)}>`,
    `Subject: ${encodeHeader(clean(msg.subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) =>
    [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrap76(b64(body))].join(CRLF);
  return [headers.join(CRLF), '', part('text/plain', msg.text), part('text/html', msg.html), `--${boundary}--`, ''].join(CRLF);
}

class Session {
  private buf = '';
  private waiter: ((r: { code: number; lines: string[] }) => void) | null = null;
  private lines: string[] = [];
  private failure: Error | null = null;

  constructor(public socket: net.Socket | tls.TLSSocket, private onFail: (e: Error) => void) {
    this.attach(socket);
  }

  attach(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => this.feed(chunk));
    socket.on('error', (e) => this.fail(e));
    socket.on('close', () => this.fail(new Error('Connexion SMTP fermée.')));
  }

  private fail(e: Error) {
    if (this.failure) return;
    this.failure = e;
    this.onFail(e);
    this.waiter?.({ code: 0, lines: [e.message] });
  }

  private feed(chunk: string) {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).replace(/\r$/, '');
      this.buf = this.buf.slice(idx + 1);
      this.lines.push(line);
      // Dernière ligne d'une réponse : « 250 texte » (le tiret signale une suite).
      if (/^\d{3}( |$)/.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), lines: this.lines };
        this.lines = [];
        this.waiter?.(reply);
        this.waiter = null;
      }
    }
  }

  reply(): Promise<{ code: number; lines: string[] }> {
    return new Promise((resolve) => {
      if (this.failure) return resolve({ code: 0, lines: [this.failure.message] });
      this.waiter = resolve;
    });
  }

  async cmd(line: string, expect: number[]): Promise<string[]> {
    this.socket.write(line + CRLF);
    return this.expect(expect);
  }

  async expect(codes: number[]): Promise<string[]> {
    const r = await this.reply();
    if (!codes.includes(r.code)) throw new Error(`SMTP ${r.code || 'erreur'} : ${r.lines.join(' ').slice(0, 200)}`);
    return r.lines;
  }
}

export async function smtpSend(cfg: SmtpConfig, msg: SmtpMessage): Promise<void> {
  const timeout = cfg.timeoutMs ?? 20_000;
  const implicitTls = cfg.port === 465;
  const ehloName = os.hostname().replace(/[^\w.-]/g, '') || 'localhost';
  const domain = msg.from.email.split('@')[1] || 'localhost';
  const tlsOptions = { host: cfg.host, servername: cfg.host, rejectUnauthorized: !cfg.allowSelfSigned, minVersion: 'TLSv1.2' as const };

  let rejectAll: (e: Error) => void = () => undefined;
  const failed = new Promise<never>((_, reject) => { rejectAll = reject; });
  failed.catch(() => undefined);

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = implicitTls
      ? tls.connect({ ...tlsOptions, port: cfg.port }, () => resolve(s))
      : net.connect({ host: cfg.host, port: cfg.port }, () => resolve(s));
    s.setTimeout(timeout, () => { s.destroy(new Error('Délai SMTP dépassé.')); });
    s.once('error', reject);
  });

  const session = new Session(socket, (e) => rejectAll(e));
  const run = async () => {
    await session.expect([220]);
    let caps = (await session.cmd(`EHLO ${ehloName}`, [250])).join(' ').toUpperCase();

    if (!implicitTls) {
      if (!caps.includes('STARTTLS')) throw new Error('Le serveur SMTP n’offre pas STARTTLS : connexion refusée par sécurité.');
      await session.cmd('STARTTLS', [220]);
      const secure = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const t = tls.connect({ ...tlsOptions, socket: session.socket as net.Socket }, () => resolve(t));
        t.once('error', reject);
      });
      session.attach(secure);
      caps = (await session.cmd(`EHLO ${ehloName}`, [250])).join(' ').toUpperCase();
    }

    if (caps.includes('AUTH') && caps.includes('PLAIN')) {
      await session.cmd(`AUTH PLAIN ${b64(`\0${cfg.user}\0${cfg.pass}`)}`, [235]);
    } else {
      await session.cmd('AUTH LOGIN', [334]);
      await session.cmd(b64(cfg.user), [334]);
      await session.cmd(b64(cfg.pass), [235]);
    }

    await session.cmd(`MAIL FROM:<${clean(msg.from.email)}>`, [250]);
    await session.cmd(`RCPT TO:<${clean(msg.to)}>`, [250, 251]);
    await session.cmd('DATA', [354]);
    session.socket.write(buildMime(msg, domain).replace(/\r?\n/g, CRLF) + CRLF + '.' + CRLF);
    await session.expect([250]);
    await session.cmd('QUIT', [221]).catch(() => undefined);
  };

  try {
    await Promise.race([run(), failed]);
  } finally {
    session.socket.destroy();
  }
}
