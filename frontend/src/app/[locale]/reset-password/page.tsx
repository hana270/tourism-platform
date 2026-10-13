'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { AuthApi } from '@/lib/auth.api';
import { authError, passwordIsValid } from '@/lib/auth-errors';
import { AuthShell, authAlert, authButton } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

type Phase = 'checking' | 'invalid' | 'form';
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

function ResetForm() {
  const locale = useLocale();
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (!token) return setPhase('invalid');
    AuthApi.checkResetToken(token).then(() => setPhase('form')).catch(() => setPhase('invalid'));
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setConfirmError('');
    if (!passwordIsValid(password)) { setShake((n) => n + 1); return setError('Votre mot de passe doit respecter les 3 conditions ci-dessous.'); }
    if (password !== confirm) { setShake((n) => n + 1); return setConfirmError('Les deux mots de passe ne sont pas identiques.'); }
    setLoading(true);
    try {
      await AuthApi.resetPassword(token, password);
      router.replace(`/${locale}/login?reset=1`);
    } catch (err) {
      setError(authError(err, 'Modification impossible. Le lien a peut-être expiré.'));
      setShake((n) => n + 1);
      setLoading(false);
    }
  }

  if (phase === 'checking') {
    return (
      <div className="py-8 text-center" role="status">
        <Loader2 className="mx-auto animate-spin text-[var(--a-muted)]" size={30} />
        <p className="mt-4 text-base font-semibold text-[var(--a-muted)]">Vérification du lien…</p>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <>
        <span className="auth-item flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--a-err-bg)] text-[var(--a-err-fg)]" style={delay(60)}><Link2Off size={30} /></span>
        <h1 className="auth-item mt-5 text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ ...delay(110), fontFamily: 'var(--font-display)' }}>Ce lien n’est plus valide</h1>
        <p className="auth-item mt-3 text-base leading-7 text-[var(--a-muted)]" style={delay(150)}>Il a expiré ou a déjà été utilisé. Pour votre sécurité, un lien ne fonctionne qu’une seule fois pendant 60 minutes.</p>
        <div className="auth-item" style={delay(200)}>
          <Link href={`/${locale}/forgot-password`} className={`${authButton} mt-7`}>Recevoir un nouveau lien <ArrowRight size={18} /></Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-item text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ ...delay(60), fontFamily: 'var(--font-display)' }}>Nouveau mot de passe</h1>
      <p className="auth-item mt-2 text-base leading-7 text-[var(--a-muted)]" style={delay(110)}>Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.</p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        {error && (
          <div key={shake} role="alert" className={`${authAlert} auth-shake`}>
            <AlertCircle size={20} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="auth-item" style={delay(160)}><PasswordField label="Nouveau mot de passe" value={password} onChange={setPassword} autoComplete="new-password" autoFocus /></div>
        <div className="auth-item" style={delay(210)}><PasswordStrength value={password} /></div>
        <div className="auth-item" style={delay(260)}>
          <PasswordField label="Confirmez le mot de passe" value={confirm} onChange={setConfirm} autoComplete="new-password" error={confirmError} />
          {confirm && password === confirm && !confirmError && (
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--a-ok-fg)]"><CheckCircle2 size={17} /> Les mots de passe correspondent</p>
          )}
        </div>
        <div className="auth-item" style={delay(310)}>
          <button type="submit" className={authButton} disabled={loading}>
            {loading ? <><Loader2 size={20} className="animate-spin" /> Enregistrement…</> : <>Enregistrer le nouveau mot de passe <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  const locale = useLocale();
  return (
    <AuthShell footer={<Link href={`/${locale}/login`} className="font-semibold underline-offset-4 hover:text-[var(--a-text)] hover:underline">← Retour à la connexion</Link>}>
      <Suspense fallback={<p className="text-base text-[var(--a-muted)]">Chargement…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
