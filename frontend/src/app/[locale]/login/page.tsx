'use client';
import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthApi } from '@/lib/auth.api';
import { apiErrorMessage } from '@/lib/api';

function LoginForm() {
  const t = useTranslations('auth'); const locale = useLocale(); const router = useRouter(); const search = useSearchParams(); const [login, setLogin] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!login || password.length < 8) { await Swal.fire({ icon:'warning', title:t('loginError'), text:t('validationLogin') }); return; } setLoading(true); try { await AuthApi.login(login, password); router.replace(search.get('next') || `/${locale}/dashboard`); } catch (err) { await Swal.fire({ icon:'error', title:t('loginError'), text:apiErrorMessage(err, t('loginError')) }); } finally { setLoading(false); } }
  return <div className="p-7 sm:p-10"><div className="mb-8"><h1 className="text-2xl font-semibold text-ink">{t('login')}</h1><p className="mt-2 text-sm text-ink-soft">{t('loginSubtitle')}</p></div><form className="space-y-5" onSubmit={submit}><label className="block"><span className="mb-1 block text-xs font-medium text-ink-soft">{t('loginField')}</span><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input className="input pl-9" type="text" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t("loginFieldPlaceholder")} required /></div></label><label className="block"><span className="mb-1 block text-xs font-medium text-ink-soft">{t('password')}</span><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input className="input pl-9" type="password" autoComplete="current-password" placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div></label><button className="btn-primary w-full" disabled={loading}>{loading ? t('submitting') : t('submit')}</button></form><Link href={`/${locale}/forgot-password`} className="mt-5 block text-center text-sm text-ink-soft hover:text-ink">{t('forgot')}</Link></div>;
}

export default function LoginPage() { const t = useTranslations('auth'); return <main className="flex min-h-screen items-center justify-center bg-bg p-4"><div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-panel md:grid-cols-2"><div className="hidden bg-accent p-10 text-accent-contrast md:flex md:flex-col md:justify-between"><div><ShieldCheck size={28} /><p className="mt-8 text-3xl font-semibold">IHOST</p><p className="mt-3 text-sm opacity-70">{t('securePanel')}</p></div><p className="text-xs opacity-60">{t('sessionsHint')}</p></div><Suspense fallback={<div className="p-10 text-sm text-ink-soft">{t('submitting')}</div>}><LoginForm /></Suspense></div></main>; }
