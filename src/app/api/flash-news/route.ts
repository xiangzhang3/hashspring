/**
 * HashSpring Flash News API
 *
 * Aggregates content from 3 pillars:
 * 1. Mainstream crypto media (RSS)
 * 2. Exchange announcements (Binance/OKX)
 * 3. Foresight News (Chinese flash news)
 *
 * GET /api/flash-news?locale=en|zh&category=BTC
 */
import { NextRequest, NextResponse } from 'next/server';
import type { FlashItem } from '@/components/FlashFeed';
import {
  RSS_SOURCES,
  BREAKING_KEYWORDS,
  IMPORTANT_KEYWORDS,
  CATEGORY_MAP,
  AI_CONFIG,
} from '@/lib/api/content-sources';

// ─── RSS Parsing ────────────────────────────────────────────
interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  sourceType: 'rss' | 'exchange' | 'foresight';
  forceCategory?: string;
  forceLevel?: 'red' | 'orange' | 'blue';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '');
}

function parseRSSXML(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  for (const block of itemBlocks) {
    const getTag = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? decodeEntities(m[1].trim()) : '';
    };
    const title = getTag('title');
    const link = getTag('link') || getTag('guid');
    const pubDate = getTag('pubDate') || getTag('dc:date') || getTag('published');
    const description = getTag('description') || getTag('content:encoded');

    if (title) {
      items.push({ title, link, pubDate, description: description.slice(0, 300) });
    }
  }
  return items;
}

// ─── Time Helpers ───────────────────────────────────────────
function relativeTime(pubDate: string, locale: string): string {
  try {
    const diff = Date.now() - new Date(pubDate).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (locale === 'zh') {
      if (mins < 1) return '刚刚';
      if (mins < 60) return `${mins}分鐘`;
      if (hours < 24) return `${hours}小時`;
      if (days < 7) return `${days}天`;
      return `${days}天`;
    }
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  } catch {
    return locale === 'zh' ? '1小時' : '1h';
  }
}

// ─── Classification ─────────────────────────────────────────
function classifyLevel(title: string, forceLevel?: 'red' | 'orange' | 'blue'): 'red' | 'orange' | 'blue' {
  if (forceLevel) return forceLevel;
  const lower = title.toLowerCase();
  if (BREAKING_KEYWORDS.some(kw => lower.includes(kw))) return 'red';
  if (IMPORTANT_KEYWORDS.some(kw => lower.includes(kw))) return 'orange';
  return 'blue';
}

function classifyCategory(title: string, forceCategory?: string): string {
  if (forceCategory) return forceCategory;
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Crypto';
}

// ─── Deduplication ──────────────────────────────────────────
function deduplicate(items: RawNewsItem[]): RawNewsItem[] {
  const result: RawNewsItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    // Normalize: lowercase, remove non-alphanumeric, take first 50 chars
    const key = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '').slice(0, 50);
    if (key.length < 5) continue;
    if (seen.has(key)) continue;

    // Check similarity with existing items
    let isDup = false;
    const seenArr = Array.from(seen);
    for (let j = 0; j < seenArr.length; j++) {
      const existing = seenArr[j];
      if (existing.length < 10 || key.length < 10) continue;
      const overlap = key.slice(0, 30) === existing.slice(0, 30);
      if (overlap) { isDup = true; break; }
    }
    if (isDup) continue;

    seen.add(key);
    result.push(item);
  }
  return result;
}

// ─── Source Fetchers ────────────────────────────────────────

async function fetchRSS(url: string, name: string): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0 (crypto news aggregator)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSXML(xml).map(item => ({
      ...item,
      source: name,
      sourceType: 'rss' as const,
    }));
  } catch {
    console.warn(`[RSS] Failed: ${name}`);
    return [];
  }
}

async function fetchBinanceAnnouncements(): Promise<RawNewsItem[]> {
  const items: RawNewsItem[] = [];

  // Binance New Listings (catalogId=48)
  try {
    const res = await fetch(
      'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=10',
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const data = await res.json();
      const articles = data?.data?.catalogs?.[0]?.articles || [];
      for (const a of articles) {
        const isListing = /will list|new listing|adds/i.test(a.title);
        const isAlpha = /alpha/i.test(a.title);
        items.push({
          title: a.title,
          link: `https://www.binance.com/en/support/announcement/${a.code}`,
          pubDate: new Date(a.releaseDate).toISOString(),
          description: a.title,
          source: isAlpha ? 'Binance Alpha' : 'Binance',
          sourceType: 'exchange',
          forceCategory: 'Exchange',
          forceLevel: isListing ? 'red' : 'orange',
        });
      }
    }
  } catch {
    console.warn('[Exchange] Binance listings fetch failed');
  }

  // Binance Futures (catalogId=130)
  try {
    const res = await fetch(
      'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=130&pageNo=1&pageSize=10',
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const data = await res.json();
      const articles = data?.data?.catalogs?.[0]?.articles || [];
      for (const a of articles) {
        items.push({
          title: a.title,
          link: `https://www.binance.com/en/support/announcement/${a.code}`,
          pubDate: new Date(a.releaseDate).toISOString(),
          description: a.title,
          source: 'Binance Futures',
          sourceType: 'exchange',
          forceCategory: 'Exchange',
          forceLevel: 'orange',
        });
      }
    }
  } catch {
    console.warn('[Exchange] Binance futures fetch failed');
  }

  return items;
}

async function fetchForesightNews(): Promise<RawNewsItem[]> {
  // Try Foresight News RSS first
  try {
    const res = await fetch('https://foresightnews.pro/rss', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (res.ok) {
      const xml = await res.text();
      return parseRSSXML(xml).map(item => ({
        ...item,
        source: 'Foresight News',
        sourceType: 'foresight' as const,
      }));
    }
  } catch {
    // fallthrough
  }

  // Fallback: try API
  try {
    const res = await fetch('https://foresightnews.pro/api/v1/news?pageSize=20', {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const news = data?.data?.list || data?.data || [];
      return (Array.isArray(news) ? news : []).map((item: Record<string, string>) => ({
        title: item.title || item.content?.slice(0, 100) || '',
        link: item.url || `https://foresightnews.pro/news/detail/${item.id}`,
        pubDate: item.publishTime || item.createdAt || new Date().toISOString(),
        description: item.content?.slice(0, 300) || item.title || '',
        source: 'Foresight News',
        sourceType: 'foresight' as const,
      }));
    }
  } catch {
    console.warn('[Foresight] All fetch methods failed');
  }
  return [];
}

// ─── AI Translation ─────────────────────────────────────────
async function translateTitlesToZh(titles: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || titles.length === 0) return titles;

  try {
    const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.translationModel,
        max_tokens: 2048,
        system: AI_CONFIG.translationPrompt,
        messages: [{
          role: 'user',
          content: `Translate these crypto news headlines to Traditional Chinese (繁體中文). Return numbered list, same order:\n\n${numbered}`,
        }],
      }),
    });

    if (!res.ok) return titles;
    const data = await res.json();
    const text: string = data.content?.[0]?.text || '';

    // Parse numbered list response
    const lines = text.split('\n').filter((l: string) => l.trim());
    const translations: string[] = [];
    for (const line of lines) {
      // Match "1. translation" or just "translation"
      const match = line.match(/^\d+\.\s*(.+)/);
      translations.push(match ? match[1].trim() : line.trim());
    }

    // Map back, fallback to original if missing
    return titles.map((original, i) => translations[i] || original);
  } catch {
    return titles;
  }
}

// ─── Main API Handler ───────────────────────────────────────
export const revalidate = 300; // 5-minute ISR cache

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';
  const categoryFilter = request.nextUrl.searchParams.get('category');

  try {
    // Fetch all 3 pillars in parallel
    const [rssResults, exchangeResults, foresightResults] = await Promise.all([
      // 1. Mainstream media RSS
      Promise.all(RSS_SOURCES.map(s => fetchRSS(s.url, s.name))),
      // 2. Exchange announcements
      fetchBinanceAnnouncements(),
      // 3. Foresight News
      fetchForesightNews(),
    ]);

    // Merge all sources
    const allItems: RawNewsItem[] = [
      ...rssResults.flat(),
      ...exchangeResults,
      ...foresightResults,
    ];

    // Deduplicate
    const unique = deduplicate(allItems);

    // Sort by date (newest first)
    unique.sort((a, b) => {
      try {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      } catch {
        return 0;
      }
    });

    // Convert to FlashItem format
    let flashItems: FlashItem[] = unique.slice(0, 30).map((item, idx) => ({
      id: `flash-${idx}-${item.source.replace(/\s/g, '').toLowerCase()}-${Date.now()}`,
      level: classifyLevel(item.title, item.forceLevel),
      time: relativeTime(item.pubDate, locale),
      title: item.title,
      category: classifyCategory(item.title, item.forceCategory),
    }));

    // Boost: red-level items to top (but maintain time order within same level)
    flashItems.sort((a, b) => {
      const levelOrder = { red: 0, orange: 1, blue: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });

    // Filter by category if requested
    if (categoryFilter && categoryFilter !== 'All') {
      flashItems = flashItems.filter(item => item.category === categoryFilter);
    }

    // Limit to 20
    flashItems = flashItems.slice(0, 20);

    // Translate to Traditional Chinese if needed
    if (locale === 'zh') {
      // Only translate English titles (skip already-Chinese ones)
      const needTranslation: number[] = [];
      const titlesToTranslate: string[] = [];

      flashItems.forEach((item, i) => {
        const hasChinese = /[\u4e00-\u9fff]/.test(item.title);
        if (!hasChinese) {
          needTranslation.push(i);
          titlesToTranslate.push(item.title);
        }
      });

      if (titlesToTranslate.length > 0) {
        const translated = await translateTitlesToZh(titlesToTranslate);
        needTranslation.forEach((itemIdx, transIdx) => {
          flashItems[itemIdx] = { ...flashItems[itemIdx], title: translated[transIdx] };
        });
      }
    }

    return NextResponse.json(flashItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Sources': `rss:${rssResults.flat().length},exchange:${exchangeResults.length},foresight:${foresightResults.length}`,
      },
    });
  } catch (error) {
    console.error('[Flash API] Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
