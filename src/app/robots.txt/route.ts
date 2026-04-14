import { NextResponse } from 'next/server';

export async function GET() {
  const body = `User-agent: *
Allow: /

# Sitemaps (canonical www domain only)
Sitemap: https://www.hashspring.com/sitemap.xml
Sitemap: https://www.hashspring.com/news-sitemap.xml

# Non-www is redirected to www via middleware — no separate sitemap needed
# Host directive for clarity
Host: https://www.hashspring.com

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
