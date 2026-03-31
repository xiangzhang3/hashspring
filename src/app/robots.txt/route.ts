import { NextResponse } from 'next/server';

export async function GET() {
  const body = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://hashspring.com/sitemap.xml

# Disallow API routes and internal paths
Disallow: /api/
Disallow: /_next/
Disallow: /s/

# Crawl-delay for polite crawling
Crawl-delay: 1
`;

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' },
  });
}
