/**
 * HashSpring RSS 2.0 Feed
 * GET /en/feed.xml — English feed
 * GET /zh/feed.xml — Chinese feed
 *
 * Direct Supabase query, real pubDate, CDATA titles, atom:link self
 */

export const revalidate = 120;

const SITE = 'https://hashspring.com';

interface NewsRow {
  content_hash: string; title: string; title_en: string; title_zh: string;
  description: string; body_en: string | null; body_zh: string | null;
  link: string; source: string; category: string; level: string; pub_date: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { locale: string } }
) {
  const locale = params.locale === 'zh' ? 'zh' : 'en';
  const isEn = locale === 'en';
  let rows: NewsRow[] = [];

  // 1. Direct Supabase query (preferred — avoids self-fetch on Vercel)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const qs = new URLSearchParams({
        select: 'content_hash,title,title_en,title_zh,description,body_en,body_zh,link,source,category,level,pub_date',
        order: 'pub_date.desc',
        limit: '50',
      });
      const res = await fetch(`${supabaseUrl}/rest/v1/flash_news?${qs}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        next: { revalidate: 120 },
      });
      if (res.ok) rows = await res.json();
    } catch (e) {
      console.warn('[RSS] Supabase fetch failed:', e);
    }
  }

  // 2. Fallback: public API
  if (!rows.length) {
    try {
      const res = await fetch(`${SITE}/api/flash-news?locale=${locale}&limit=50`, {
        signal: AbortSignal.timeout(8000), next: { revalidate: 120 },
      });
      if (res.ok) {
        const data = await res.json();
        rows = (data || []).map((d: any) => ({
          content_hash: d.id || '', title: d.title || '', title_en: d.title || '',
          title_zh: d.title || '', description: d.summary || '',
          body_en: null, body_zh: null, link: d.link || d.url || '',
          source: d.source || '', category: d.category || '',
          level: d.level || 'blue', pub_date: d.time || new Date().toISOString(),
        }));
      }
    } catch {}
  }

  const title = isEn ? 'HashSpring \u2014 Crypto Flash News' : 'HashSpring \u2014 \u52a0\u5bc6\u8d27\u5e01\u5feb\u8baf';
  const description = isEn
    ? 'Real-time cryptocurrency news, breaking updates, and market intelligence from HashSpring.'
    : 'HashSpring \u5373\u65f6\u52a0\u5bc6\u8d27\u5e01\u5feb\u8baf\u3001\u7a81\u53d1\u65b0\u95fb\u4e0e\u5e02\u573a\u60c5\u62a5\u3002';
  const feedUrl = `${SITE}/${locale}/feed.xml`;
  const lastBuild = rows.length ? new Date(rows[0].pub_date).toUTCString() : new Date().toUTCString();

  const itemsXml = rows.map((row) => {
    const t = isEn ? (row.title_en || row.title) : (row.title_zh || row.title);
    const d = isEn ? (row.body_en || row.description) : (row.body_zh || row.description);
    const link = row.link || `${SITE}/${locale}/flashnews`;
    const guid = row.content_hash ? `${SITE}/news/${row.content_hash}` : link;
    const pub = row.pub_date ? new Date(row.pub_date).toUTCString() : '';
    return `    <item>
      <title><![CDATA[${t || 'Untitled'}]]></title>
      <link>${esc(link)}</link>
      <description><![CDATA[${(d || '').slice(0, 500)}]]></description>
      <guid isPermaLink="false">${esc(guid)}</guid>${pub ? '\n      <pubDate>' + pub + '</pubDate>' : ''}${row.category ? '\n      <category>' + esc(row.category) + '</category>' : ''}
      <source url="${feedUrl}">${esc(row.source || 'HashSpring')}</source>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(title)}</title>
    <link>${SITE}/${locale}</link>
    <description>${esc(description)}</description>
    <language>${isEn ? 'en' : 'zh-CN'}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>5</ttl>
    <generator>HashSpring RSS</generator>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/icon.png</url>
      <title>${esc(title)}</title>
      <link>${SITE}/${locale}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
