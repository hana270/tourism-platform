'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, Clock, Loader2, Mail, MailCheck, Search } from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { AuthApi } from '@/lib/auth.api';
import { authError } from '@/lib/auth-errors';
import { AuthShell, authAlert, authButton, authInput } from '@/components/auth/AuthShell';

const COOLDOWN = 60;
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send(address: string) {
    setLoading(true);
    setError('');
    try {
      await AuthApi.forgotPassword(address);
      setSentTo(address);
      setWait(COOLDOWN);
    } catch (err) {
      setError(authError(err, 'Envoi impossible pour le moment. Réessayez dans un instant.'));
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Saisissez une adresse e-mail valide (exemple : nom@domaine.com).');
      setShake((n) => n + 1);
      return;
    }
    void send(value);
  }

  const back = (
    <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:text-[var(--a-text)] hover:underline"><ArrowLeft size={16} /> Retour à la connexion</Link>
  );

  if (sentTo) {
    return (
      <AuthShell footer={back}>
        <span className="auth-item flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--a-ok-bg)] text-[var(--a-ok-fg)]" style={delay(60)}><MailCheck size={32} /></span>
        <h1 className="auth-item mt-5 text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ ...delay(110), fontFamily: 'var(--font-display)' }}>Vérifiez votre boîte mail</h1>
        <p className="auth-item mt-3 text-base leading-7 text-[var(--a-muted)]" style={delay(150)}>
          Si un compte existe pour <strong className="break-all text-[var(--a-text)]">{sentTo}</strong>, nous venons de lui envoyer un e-mail avec un lien pour choisir un nouveau mot de passe.
        </p>
        <ul className="auth-item mt-6 space-y-3.5 rounded-2xl border border-[var(--a-border)] bg-[var(--a-soft)] p-5 text-[15px]" style={delay(200)}>
          <li className="flex items-start gap-3"><Clock size={20} className="mt-0.5 shrink-0" /> Le lien est valable <strong>60 minutes</strong>.</li>
          <li className="flex items-start gap-3"><Search size={20} className="mt-0.5 shrink-0" /> Rien reçu ? Regardez dans vos <strong>courriers indésirables (spam)</strong>.</li>
        </ul>
        <div className="auth-item" style={delay(250)}>
          <button type="button" onClick={() => void send(sentTo)} disabled={wait > 0 || loading} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--a-text)] text-base font-bold text-[var(--a-text)] transition hover:bg-[var(--a-soft)] disabled:cursor-not-allowed disabled:opacity-50">
            {loading && <Loader2 size={20} className="animate-spin" />}
            {wait > 0 ? `Renvoyer l’e-mail (${wait} s)` : 'Renvoyer l’e-mail'}
          </button>
          <button type="button" onClick={() => { setSentTo(''); setEmail(''); }} className="mt-4 w-full text-center text-[15px] font-semibold text-[var(--a-muted)] underline-offset-4 hover:text-[var(--a-text)] hover:underline">Utiliser une autre adresse</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer={back}>
      <h1 className="auth-item text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ ...delay(80), fontFamily: 'var(--font-display)' }}>Mot de passe oublié ?</h1>
      <p className="auth-item mt-2 text-base leading-7 text-[var(--a-muted)]" style={delay(130)}>Pas de souci. Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.</p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        {error && (
          <div key={shake} role="alert" className={`${authAlert} auth-shake`}>
            <AlertCircle size={20} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="auth-item" style={delay(180)}>
          <label htmlFor="email" className="mb-2 block text-[15px] font-bold">Adresse e-mail</label>
          <div className="relative">
            <Mail size={19} aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" />
            <input id="email" className={`${authInput} ps-12`} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@exemple.com" aria-invalid={!!error} />
          </div>
        </div>
        <div className="auth-item" style={delay(230)}>
          <button type="submit" className={authButton} disabled={loading}>
            {loading ? <><Loader2 size={20} className="animate-spin" /> Envoi en cours…</> : <>Recevoir le lien par e-mail <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
