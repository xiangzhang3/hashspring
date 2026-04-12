/**
 * HashSpring RSS 2.0 Feed
 *
 * GET /en/feed.xml  — English crypto news feed
 * GET /zh/feed.xml  — Chinese crypto news feed
 * GET /fil/feed.xml — Filipino crypto news feed
 *
 * Includes both flash news AND analysis articles, sorted by date.
 *
 * Features:
 * - Direct Supabase query (no self-fetch issues on Vercel)
 * - Real pubDate per item from database
 * - CDATA-wrapped titles/descriptions for safe XML
 * - atom:link self-reference for feed readers
 * - Unique guid per item via content_hash or slug
 * - 50 most recent items (flash + articles combined), 2-minute cache
 * - dc:creator for author attribution (Google News requirement)
 */

export const revalidate = 120;

const SITE = 'https://www.hashspring.com';

interface FlashRow {
  type: 'flash';
  content_hash: string;
  title: string;
  title_en: string;
  title_zh: string;
  title_fil: string | null;
  description: string;
  body_en: string | null;
  body_zh: string | null;
  body_fil: string | null;
  link: string;
  source: string;
  category: string;
  level: string;
  pub_date: string;
}

interface ArticleRow {
  type: 'article';
  slug: string;
  title: string;
  title_en: string | null;
  title_fil: string | null;
  excerpt: string;
  excerpt_en: string | null;
  excerpt_fil: string | null;
  category: string;
  author: string;
  source: string;
  published_at: string;
}

type FeedItem = {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  category: string;
  source: string;
  author: string;
  itemType: 'flash' | 'article';
};

export async function GET(
  _request: Request,
  { params }: { params: { locale: string } }
) {
  const locale = params.locale === 'zh' ? 'zh' : params.locale === 'fil' ? 'fil' : 'en';
  const isEn = locale === 'en';
  const isFil = locale === 'fil';

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  const feedItems: FeedItem[] = [];

  if (supabaseUrl && supabaseKey) {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    // ── 1. Fetch flash news ────────────────────────────────
    try {
      const flashQs = new URLSearchParams({
        select: 'content_hash,title,title_en,title_zh,title_fil,description,body_en,body_zh,body_fil,link,source,category,level,pub_date',
        order: 'pub_date.desc',
        limit: '30',
      });
      const res = await fetch(`${supabaseUrl}/rest/v1/flash_news?${flashQs}`, {
        headers,
        next: { revalidate: 120 },
      });
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          const itemTitle = isEn
            ? row.title_en || row.title
            : isFil
              ? row.title_fil || row.title_en || row.title
              : row.title_zh || row.title;
          const itemDesc = row.description
            || (isEn ? row.body_en : isFil ? (row.body_fil || row.body_en) : row.body_zh)
            || '';

          // Build SEO slug for flash detail link
          const slug = (row.title_en || row.title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
          const shortHash = (row.content_hash || '').replace(/^h/, '').slice(0, 8);
          const seoSlug = slug ? `${slug}-${shortHash}` : row.content_hash;

          feedItems.push({
            title: itemTitle || 'Untitled',
            description: (itemDesc || '').slice(0, 500),
            link: row.link || `${SITE}/${locale}/flash/${encodeURIComponent(seoSlug)}`,
            guid: row.content_hash ? `${SITE}/news/${row.content_hash}` : row.link || '',
            pubDate: row.pub_date || '',
            category: row.category || 'Crypto',
            source: row.source || 'HashSpring',
            author: 'HashSpring',
            itemType: 'flash',
          });
        }
      }
    } catch (e) {
      console.warn('[RSS] Flash news fetch failed:', e);
    }

    // ── 2. Fetch analysis articles ─────────────────────────
    try {
      const articleQs = new URLSearchParams({
        select: 'slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,category,author,source,published_at',
        is_published: 'eq.true',
        order: 'published_at.desc',
        limit: '20',
      });
      const res = await fetch(`${supabaseUrl}/rest/v1/articles?${articleQs}`, {
        headers,
        next: { revalidate: 120 },
      });
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          const itemTitle = isEn
            ? row.title_en || row.title
            : isFil
              ? row.title_fil || row.title_en || row.title
              : row.title;
          const itemDesc = isEn
            ? row.excerpt_en || row.excerpt || ''
            : isFil
              ? row.excerpt_fil || row.excerpt_en || row.excerpt || ''
              : row.excerpt || '';
          const articleUrl = `${SITE}/${locale}/analysis/${row.slug}`;

          feedItems.push({
            title: itemTitle || 'Untitled',
            description: (itemDesc || '').slice(0, 500),
            link: articleUrl,
            guid: articleUrl,
            pubDate: row.published_at || '',
            category: row.category || 'analysis',
            source: row.source === 'tuoniaox'
              ? (isEn ? 'Tuoniaox Archive' : isFil ? 'Tuoniaox Archive' : '鸵鸟区块链存档')
              : 'HashSpring',
            author: row.author || 'HashSpring Desk',
            itemType: 'article',
          });
        }
      }
    } catch (e) {
      console.warn('[RSS] Articles fetch failed:', e);
    }
  }

  // ── 3. Sort by date (newest first) and limit to 50 ─────
  feedItems.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });
  const items = feedItems.slice(0, 50);

  // ── Channel info ────────────────────────────────────────
  const channelTitle = isEn
    ? 'HashSpring — Crypto News & Analysis'
    : isFil
      ? 'HashSpring — Crypto Balita at Pagsusuri'
      : 'HashSpring — 加密货币快讯与深度分析';
  const channelDesc = isEn
    ? 'Real-time cryptocurrency news, in-depth analysis, and market intelligence from HashSpring.'
    : isFil
      ? 'Real-time na balita, malalimang pagsusuri, at market intelligence mula sa HashSpring.'
      : 'HashSpring 即时加密货币快讯、深度分析与市场情报。';
  const feedUrl = `${SITE}/${locale}/feed.xml`;
  const lastBuild = items.length
    ? new Date(items[0].pubDate).toUTCString()
    : new Date().toUTCString();

  // ── Build items XML ─────────────────────────────────────
  const itemsXml = items
    .map((item) => {
      const pubDate = item.pubDate
        ? new Date(item.pubDate).toUTCString()
        : '';

      return `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${esc(item.link)}</link>
      <description><![CDATA[${item.description}]]></description>
      <guid isPermaLink="${item.itemType === 'article' ? 'true' : 'false'}">${esc(item.guid)}</guid>${
        pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ''
      }${
        item.category
          ? `\n      <category>${esc(item.category)}</category>`
          : ''
      }
      <dc:creator>${esc(item.author)}</dc:creator>
      <source url="${feedUrl}">${esc(item.source)}</source>
    </item>`;
    })
    .join('\n');

  // ── Full RSS document ───────────────────────────────────
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(channelTitle)}</title>
    <link>${SITE}/${locale}</link>
    <description>${esc(channelDesc)}</description>
    <language>${isEn ? 'en' : isFil ? 'fil' : 'zh-CN'}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>5</ttl>
    <generator>HashSpring RSS</generator>
    <copyright>© 2026 HashSpring Global. All rights reserved.</copyright>
    <managingEditor>hello@hashspring.com (HashSpring)</managingEditor>
    <webMaster>hello@hashspring.com (HashSpring)</webMaster>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/icon.png</url>
      <title>${esc(channelTitle)}</title>
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
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
