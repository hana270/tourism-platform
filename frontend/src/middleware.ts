import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale } from '@/i18n/config';

/**
 * Une seule locale de routage : /fr
 *
 * - `/`               → `/fr`
 * - `/dashboard`      → `/fr/dashboard`
 * - `/en/...`, `/ar/...` (anciens liens) → `/fr/...`
 *
 * Les autres langues sont gérées par Google Translate dans le navigateur.
 */
const LEGACY_LOCALE = /^\/(en|it|de|es|ar|pt|nl)(?=\/|$)/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const legacy = pathname.match(LEGACY_LOCALE);
  const rest = legacy ? pathname.slice(legacy[0].length) : pathname;

  url.pathname = `/${defaultLocale}${rest === '/' ? '' : rest}`;

  return NextResponse.redirect(url);
}

export const config = {
  // On ignore les routes API, les fichiers statiques et les internes Next.js
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
