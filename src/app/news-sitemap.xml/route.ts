import { NextResponse } from 'next/server';

export const revalidate = 300; // 5 min cache

export async function GET() {
  const baseUrl = 'https://hashspring.com';
  let flashItems: Array<{ id: string; title: string; category: string; time: string; source?: string }> = [];

  try {
    const apiUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/flash-news?locale=en`
      : `${baseUrl}/api/flash-news?locale=en`;

    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        flashItems = data.slice(0, 100); // Increase to 100 for better coverage
      }
    }
  } catch {
    // Fallback: empty items
  }

  // Generate entries for both en and zh
  const entries = flashItems.flatMap((item) => {
    const pubDate = item.time ? new Date(item.time).toISOString() : new Date().toISOString();
    return [
      {
        loc: `${baseUrl}/en/flash/${encodeURIComponent(item.id)}`,
        lang: 'en',
        title: item.title,
        pubDate,
        keywords: `${item.category}, crypto, blockchain`,
      },
      {
        loc: `${baseUrl}/zh/flash/${encodeURIComponent(item.id)}`,
        lang: 'zh',
        title: item.title,
        pubDate,
        keywords: `${item.category}, crypto, blockchain`,
      },
    ];
  });

  // If no news articles exist, return a valid sitemap with the homepage as a placeholder
  // to avoid Google's "Missing XML tag" error for empty <urlset>
  if (entries.length === 0) {
    const now = new Date().toISOString();
    entries.push(
      {
        loc: `${baseUrl}/en`,
        lang: 'en',
        title: 'HashSpring — Crypto Intelligence',
        pubDate: now,
        keywords: 'crypto, blockchain, news',
      },
      {
        loc: `${baseUrl}/zh`,
        lang: 'zh',
        title: 'HashSpring — 加密货币情报',
        pubDate: now,
        keywords: 'crypto, blockchain, news',
      },
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>
    <xhtml:link rel="alternate" hreflang="${e.lang === 'en' ? 'zh' : 'en'}" href="${e.loc.replace(`/${e.lang}/`, `/${e.lang === 'en' ? 'zh' : 'en'}/`)}" />
    <news:news>
      <news:publication>
        <news:name>HashSpring</news:name>
        <news:language>${e.lang}</news:language>
      </news:publication>
      <news:publication_date>${e.pubDate}</news:publication_date>
      <news:title>${escapeXml(e.title)}</news:title>
      <news:keywords>${escapeXml(e.keywords)}</news:keywords>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
