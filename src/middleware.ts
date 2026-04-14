import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_LOCALES = ['en', 'zh', 'fil'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // 1. Non-www → www 301 redirect (single canonical domain)
  if (host === 'hashspring.com') {
    const url = request.nextUrl.clone();
    url.host = 'www.hashspring.com';
    return NextResponse.redirect(url, 301);
  }

  // 2. Root path → default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url), 301);
  }

  // 3. Paths without locale prefix → redirect to /en/...
  //    Skip: _next, api, s (short links), static files, sitemap, robots, feed
  const firstSegment = pathname.split('/')[1];
  const skipPrefixes = ['_next', 'api', 's', 'sitemap', 'robots.txt', 'favicon.ico', 'hashspring2026indexnow.txt'];
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|xml|txt|json|js|css|woff2?)$/.test(pathname);

  if (
    !VALID_LOCALES.includes(firstSegment) &&
    !skipPrefixes.includes(firstSegment) &&
    !isStaticFile
  ) {
    // e.g. /flashnews → /en/flashnews, /analysis → /en/analysis
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
