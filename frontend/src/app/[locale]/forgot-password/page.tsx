'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import Swal from 'sweetalert2';
import { AuthApi } from '@/lib/auth.api';
import { apiErrorMessage } from '@/lib/api';
export default function ForgotPasswordPage() { const t = useTranslations('auth'); const locale = useLocale(); const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); try { await AuthApi.forgotPassword(email); await Swal.fire({ icon:'success', title:t('resetTitle'), text:t('resetSent') }); } catch (err) { await Swal.fire({ icon:'error', title:t('loginError'), text:apiErrorMessage(err, t('resetSent')) }); } finally { setLoading(false); } } return <main className="flex min-h-screen items-center justify-center bg-bg p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-panel sm:p-10"><h1 className="text-2xl font-semibold text-ink">{t('resetTitle')}</h1><p className="mt-2 text-sm text-ink-soft">{t('forgotSubtitleShort')}</p><form className="mt-7 space-y-5" onSubmit={submit}><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><button className="btn-primary w-full" disabled={loading}>{loading ? '…' : t('sendLink')}</button></form><Link className="mt-6 block text-center text-sm text-ink-soft hover:text-ink" href={`/${locale}/login`}>{t('backLogin')}</Link></div></main>; }
