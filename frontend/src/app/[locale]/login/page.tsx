'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, User } from 'lucide-react';
import { useLocale } from '@/i18n/translate';
import { AuthApi } from '@/lib/auth.api';
import { authError, safeNext } from '@/lib/auth-errors';
import { AuthShell, authAlert, authButton, authInput } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

function LoginForm() {
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof fieldErrors = {};
    if (!login.trim()) next.login = 'Saisissez votre e-mail ou votre nom d’utilisateur.';
    if (password.length < 8) next.password = 'Le mot de passe contient au moins 8 caractères.';
    setFieldErrors(next);
    setError('');
    if (Object.keys(next).length) return setShake((n) => n + 1);

    setLoading(true);
    try {
      await AuthApi.login(login.trim(), password);
      router.replace(safeNext(search.get('next'), `/${locale}/dashboard`));
    } catch (err) {
      setError(authError(err, 'Connexion impossible. Vérifiez vos identifiants.'));
      setShake((n) => n + 1);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="auth-item text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ ...delay(80), fontFamily: 'var(--font-display)' }}>Connexion</h1>
      <p className="auth-item mt-2 text-base leading-7 text-[var(--a-muted)]" style={delay(130)}>Accédez à votre espace administrateur.</p>

      {search.get('reset') === '1' && (
        <p className="auth-item mt-5 flex items-center gap-2.5 rounded-xl bg-[var(--a-ok-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--a-ok-fg)]" role="status" style={delay(160)}>
          <CheckCircle2 size={19} /> Mot de passe modifié. Connectez-vous avec le nouveau.
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        {error && (
          <div key={shake} role="alert" className={`${authAlert} auth-shake`}>
            <AlertCircle size={20} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="auth-item" style={delay(190)}>
          <label htmlFor="login" className="mb-2 block text-[15px] font-bold">E-mail ou nom d’utilisateur</label>
          <div className="relative">
            <User size={19} aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--a-muted)]" />
            <input
              id="login"
              className={`${authInput} ps-12`}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="vous@exemple.com"
              aria-invalid={!!fieldErrors.login}
              aria-describedby={fieldErrors.login ? 'login-err' : undefined}
            />
          </div>
          {fieldErrors.login && <p id="login-err" role="alert" className="mt-2 text-sm font-semibold text-[var(--a-err-fg)]">{fieldErrors.login}</p>}
        </div>

        <div className="auth-item" style={delay(240)}>
          <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Votre mot de passe" error={fieldErrors.password} />
          <div className="mt-2 text-end">
            <Link href={`/${locale}/forgot-password`} className="text-[15px] font-bold text-[var(--a-text)] underline decoration-[var(--a-accent)] decoration-2 underline-offset-4 hover:decoration-[var(--a-text)]">Mot de passe oublié ?</Link>
          </div>
        </div>

        <div className="auth-item" style={delay(290)}>
          <button type="submit" className={authButton} disabled={loading}>
            {loading ? <><Loader2 size={20} className="animate-spin" /> Connexion en cours…</> : <>Se connecter <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p className="text-base text-[var(--a-muted)]">Chargement…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
