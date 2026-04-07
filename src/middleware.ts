import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { hostname, pathname, search } = request.nextUrl;

  // ── SEO: www → non-www 301 redirect ──
  // 统一域名，避免 www 和 non-www 重复索引分散权重
  if (hostname === 'www.hashspring.com') {
    const url = new URL(`https://hashspring.com${pathname}${search}`);
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Apply to all paths except Next.js internals and static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
