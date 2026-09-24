'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useLocale } from '@/i18n/translate';
import { usePathname, useRouter } from 'next/navigation';
import { AuthApi, CurrentUser } from '@/lib/auth.api';

type UserContextValue = { user: CurrentUser | null; setUser: React.Dispatch<React.SetStateAction<CurrentUser | null>> };
const UserContext = createContext<UserContextValue>({ user: null, setUser: () => undefined });

export function useCurrentUser(): CurrentUser | null {
  return useContext(UserContext).user;
}
export function useSetCurrentUser() {
  return useContext(UserContext).setUser;
}

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    AuthApi.me()
      .then((me) => !cancelled && setUser(me))
      .catch(
        () =>
          !cancelled &&
          router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`),
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <span className="anim-pop flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-accent-contrast">
            IH
          </span>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-surface-alt">
            <div className="top-progress h-full w-full rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  }
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}