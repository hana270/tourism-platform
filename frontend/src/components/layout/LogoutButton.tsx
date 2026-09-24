'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from '@/i18n/translate';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { AuthApi } from '@/lib/auth.api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export function LogoutButton({
  className,
  label,
  iconOnly,
}: {
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const t = useTranslations('header');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await AuthApi.logout();
      router.replace(`/${locale}/login`);
    } catch {
      showToast('error', t('logoutError'));
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        title={label ?? t('logout')}
        aria-label={label ?? t('logout')}
      >
        <LogOut size={17} strokeWidth={1.75} className="shrink-0 rtl:rotate-180" />
        {!iconOnly && <span className="truncate">{label ?? t('logout')}</span>}
      </button>
      <ConfirmDialog
        open={open}
        title={t('logout')}
        text={t('logoutConfirm')}
        confirmLabel={t('logout')}
        cancelLabel={tc('cancel')}
        destructive
        loading={loading}
        onConfirm={confirm}
        onCancel={() => !loading && setOpen(false)}
      />
    </>
  );
}