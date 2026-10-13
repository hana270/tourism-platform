import Link from 'next/link';
import { Lock, ShieldCheck } from 'lucide-react';

/**
 * Cadre commun des pages d'accès : fond animé discret, carte centrée, mode sombre.
 * Lisibilité d'abord : textes ≥ 16 px, fort contraste, grandes zones de clic.
 */
export function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="auth-root relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Décor : grille de points + deux halos qui flottent lentement */}
      <div aria-hidden="true" className="auth-dots pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="auth-blob-a pointer-events-none absolute -start-32 -top-32 -z-10 h-[420px] w-[420px] rounded-full bg-[var(--a-accent)] opacity-25 blur-[110px]" />
      <div aria-hidden="true" className="auth-blob-b pointer-events-none absolute -bottom-40 -end-32 -z-10 h-[460px] w-[460px] rounded-full bg-[var(--a-text)] opacity-[.07] blur-[120px]" />

      <div className="w-full max-w-[440px]">
        <Link href="/fr" aria-label="IHOST — retour au site" className="auth-item mx-auto mb-7 flex w-fit items-center gap-3" style={{ animationDelay: '40ms' }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--a-primary)] text-[var(--a-primary-fg)] shadow-lg"><ShieldCheck size={22} /></span>
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>IHOST</span>
        </Link>

        <div className="auth-card rounded-3xl border border-[var(--a-border)] bg-[var(--a-card)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,.45)] sm:p-9">
          {children}
        </div>

        <div className="auth-item mt-6 space-y-3 text-center text-sm text-[var(--a-muted)]" style={{ animationDelay: '260ms' }}>
          {footer ?? <Link href="/fr" className="font-semibold underline-offset-4 hover:text-[var(--a-text)] hover:underline">← Retour au site</Link>}
          <p className="flex items-center justify-center gap-1.5 text-xs"><Lock size={12} /> Connexion chiffrée · Accès réservé aux administrateurs</p>
        </div>
      </div>
    </main>
  );
}

export const authInput =
  'h-[52px] w-full rounded-xl border border-[var(--a-border)] bg-[var(--a-card)] px-4 text-base font-medium text-[var(--a-text)] outline-none transition-all placeholder:text-[var(--a-muted)]/60 hover:border-[var(--a-muted)] focus:border-[var(--a-text)] focus:shadow-[0_0_0_4px_var(--a-ring)] aria-[invalid=true]:border-[var(--a-err-fg)]';

export const authButton =
  'auth-btn flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--a-primary)] px-6 text-base font-bold text-[var(--a-primary-fg)] shadow-sm transition-all hover:bg-[var(--a-primary-hover)] hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--a-accent)] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60';

export const authAlert =
  'flex items-start gap-3 rounded-xl border border-[var(--a-err-border)] bg-[var(--a-err-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--a-err-fg)]';
