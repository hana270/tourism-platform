'use client';

import { usePathname } from 'next/navigation';
import { getLocaleFromPathname } from './locale';

export function useAppLocale() {
  return getLocaleFromPathname(usePathname() || '/');
}
