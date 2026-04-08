import { NextResponse } from 'next/server';

export const revalidate = 300; // 5 min cache

// Google News Sitemap 要求只包含最近 2 天的文章
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export async function GET() {
  const baseUrl = 'https://www.hashspring.com';
  let flashItems: Array<{ id: string; title: string; category: string; time: string; source?: string }> = [];

  // 优先从 Supabase 直接获取，覆盖更多文章
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const cutoff = new Date(Date.now() - TWO_DAYS_MS).toISOString();

  if (supabaseUrl && supabaseKey) {
    try {
      const params = new URLSearchParams({
        select: 'content_hash,title,title_en,category,pub_date,source',
        order: 'pub_date.desc',
        limit: '500',
        'pub_date': `gte.${cutoff}`,
      });
      const res = await fetch(`${supabaseUrl}/rest/v1/flash_news?${params}`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const rows = await res.json();
        flashItems = rows.map((r: any) => ({
          id: generateSeoSlug(r.title_en || r.title || '', r.content_hash || ''),
          title: r.title_en || r.title || '',
          category: r.category || 'Crypto',
          time: r.pub_date || new Date().toISOString(),
          source: r.source,
        }));
      }
    } catch {
      // fallback to API
    }
  }

  // Fallback: internal API
  if (flashItems.length === 0) {
    try {
      const apiUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/flash-news?locale=en`
        : `${baseUrl}/api/flash-news?locale=en`;

      const res = await fetch(apiUrl, { next: { revalidate: 300 } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          flashItems = data.slice(0, 200);
        }
      }
    } catch {
      // empty
    }
  }

  // Generate entries for all 3 locales: en, zh, fil
  const locales = ['en', 'zh', 'fil'] as const;
  const entries = flashItems.flatMap((item) => {
    const pubDate = item.time ? new Date(item.time).toISOString() : new Date().toISOString();
    return locales.map((lang) => ({
      loc: `${baseUrl}/${lang}/flash/${encodeURIComponent(item.id)}`,
      lang,
      title: item.title,
      pubDate,
      keywords: `${item.category}, crypto, blockchain`,
    }));
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
      {
        loc: `${baseUrl}/fil`,
        lang: 'fil',
        title: 'HashSpring — Crypto Intelligence',
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
    ${['en', 'zh', 'fil'].filter(l => l !== e.lang).map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${e.loc.replace(`/${e.lang}/`, `/${l}/`)}" />`).join('\n    ')}
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

function generateSeoSlug(title: string, hashId: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\$([a-z0-9]+)/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const shortHash = hashId.replace(/^h/, '').slice(0, 8);
  return slug ? `${slug}-${shortHash}` : hashId;
}
