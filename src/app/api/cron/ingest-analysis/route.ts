/**
 * Analysis Article Ingestion Cron
 *
 * Fetches analysis/opinion articles from crypto RSS feeds,
 * filters for long-form content, translates to Chinese,
 * and inserts into the `articles` table.
 *
 * Schedule: Every 6 hours (0 */6 * * *)
 * Manual:   GET /api/cron/ingest-analysis
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

const MAX_ARTICLES = 10; // per run

// ── RSS Sources ─────────────────────────────────────────
const SOURCES = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
];

const ANALYSIS_KEYWORDS = [
  'analysis', 'opinion', 'insight', 'deep dive', 'explained',
  'outlook', 'forecast', 'review', 'report', 'commentary',
  'why', 'how', 'what it means', 'implications', 'strategy', 'guide',
];

const CATEGORY_MAP: Record<string, string[]> = {
  btc: ['bitcoin', 'btc', 'halving', 'mining'],
  eth: ['ethereum', 'eth', 'vitalik'],
  defi: ['defi', 'dex', 'lending', 'yield', 'tvl'],
  nft: ['nft', 'opensea', 'collection'],
  l2: ['layer 2', 'rollup', 'arbitrum', 'optimism'],
  policy: ['sec', 'regulation', 'law', 'compliance', 'congress'],
  sol: ['solana', 'sol'],
  ai: ['ai', 'artificial intelligence', 'machine learning'],
};

// ── Helpers ──────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function makeSlug(title: string, source: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  // short hash for uniqueness
  let hash = 0;
  const str = `${source}:${title}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).slice(0, 6);
  return base ? `${base}-${hex}` : hex;
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_MAP)) {
    if (kws.some((kw) => lower.includes(kw))) return cat;
  }
  return 'analysis';
}

function isAnalysis(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  if (desc.length >= 300) return true;
  return ANALYSIS_KEYWORDS.some((kw) => text.includes(kw));
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  contentHtml: string;
  pubDate: string;
  author: string;
  source: string;
}

async function fetchRss(url: string, sourceName: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HashSpring-Bot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: RssItem[] = [];
    // Simple regex-based XML parsing (Edge Runtime compatible)
    const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

    for (const block of itemMatches) {
      const getTag = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        if (!m) return '';
        // Handle CDATA
        const val = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        return val.trim();
      };

      const title = stripHtml(getTag('title'));
      const link = getTag('link').replace(/<[^>]*>/g, '').trim();
      const desc = stripHtml(getTag('description'));
      const contentEncoded = getTag('content:encoded');
      const pubDate = getTag('pubDate');
      const author = getTag('dc:creator') || getTag('author') || sourceName;

      if (title && link) {
        items.push({
          title,
          link,
          description: desc,
          contentHtml: contentEncoded || getTag('description'),
          pubDate,
          author,
          source: sourceName,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function translateToZh(
  title: string,
  excerpt: string
): Promise<{ titleZh: string; excerptZh: string }> {
  if (!ANTHROPIC_KEY) return { titleZh: '', excerptZh: '' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Translate to Simplified Chinese. Return JSON only: {"title_zh":"...","excerpt_zh":"..."}\n\nTitle: ${title}\nExcerpt: ${excerpt.slice(0, 500)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return { titleZh: '', excerptZh: '' };
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        titleZh: parsed.title_zh || '',
        excerptZh: parsed.excerpt_zh || '',
      };
    }
  } catch { /* ignore */ }
  return { titleZh: '', excerptZh: '' };
}

// ── Main handler ────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // Allow Vercel cron (no auth header) but block random callers
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[ingest-analysis] ${msg}`);
  };

  log('Starting analysis article ingestion...');

  // 1. Fetch from all RSS sources
  const allItems: RssItem[] = [];
  for (const src of SOURCES) {
    const items = await fetchRss(src.url, src.name);
    const analysis = items.filter((it) => isAnalysis(it.title, it.description));
    log(`${src.name}: ${items.length} total → ${analysis.length} analysis`);
    allItems.push(...analysis);
  }

  if (allItems.length === 0) {
    log('No analysis articles found.');
    return NextResponse.json({ ok: true, inserted: 0, logs });
  }

  // 2. Dedup against existing source_urls
  const urls = allItems.map((a) => a.link).filter(Boolean);
  let existingUrls = new Set<string>();
  try {
    const urlFilter = urls.slice(0, 50).map((u) => `"${u}"`).join(',');
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=source_url&source_url=in.(${urlFilter})`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (qRes.ok) {
      const rows = await qRes.json();
      existingUrls = new Set(rows.map((r: { source_url: string }) => r.source_url));
    }
  } catch { /* proceed with empty set */ }

  const newItems = allItems.filter((a) => !existingUrls.has(a.link));
  log(`${allItems.length} candidates, ${existingUrls.size} exist, ${newItems.length} new`);

  // Sort newest first and limit
  newItems.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });
  const batch = newItems.slice(0, MAX_ARTICLES);

  // 3. Process each article
  let inserted = 0;
  for (const item of batch) {
    const slug = makeSlug(item.title, item.source);
    const category = detectCategory(`${item.title} ${item.description}`);
    const excerpt = item.description.slice(0, 500);
    const contentText = stripHtml(item.contentHtml || item.description);
    const charCount = contentText.length;
    const readTime = Math.max(1, Math.round(charCount / 1000));

    // Translate
    const { titleZh, excerptZh } = await translateToZh(item.title, excerpt);

    // Parse date
    let publishedAt: string | null = null;
    try {
      const d = new Date(item.pubDate);
      if (!isNaN(d.getTime())) publishedAt = d.toISOString();
    } catch { /* skip */ }

    const row = {
      slug,
      title: titleZh || item.title,
      title_en: item.title,
      excerpt: excerptZh || excerpt,
      excerpt_en: excerpt,
      content: contentText.slice(0, 10000),
      content_html: (item.contentHtml || item.description).slice(0, 20000),
      cover_image: '',
      category: 'analysis',
      author: item.author || item.source,
      tags: category !== 'analysis' ? [category] : [],
      locale: titleZh ? 'zh' : 'en',
      source: item.source.toLowerCase().replace(/\s+/g, ''),
      source_url: item.link,
      published_at: publishedAt || new Date().toISOString(),
      char_count: charCount,
      read_time: readTime,
      is_published: true,
      is_featured: false,
    };

    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(10000),
      });

      if (insertRes.ok) {
        inserted++;
        log(`✓ ${item.title.slice(0, 50)}...`);
      } else {
        const err = await insertRes.text();
        log(`✗ ${slug}: ${err.slice(0, 100)}`);
      }
    } catch (e) {
      log(`✗ ${slug}: ${e}`);
    }

    // Small delay for rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  log(`Done: ${inserted}/${batch.length} articles ingested`);

  return NextResponse.json({
    ok: true,
    inserted,
    total: batch.length,
    logs,
  });
}
