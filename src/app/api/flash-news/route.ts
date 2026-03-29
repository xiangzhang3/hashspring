/**
 * HashSpring Flash News API
 *
 * 优先从 Supabase 读取 worker 写入的数据
 * Supabase 失败时回退到直接抓取（保证稳定性）
 *
 * GET /api/flash-news?locale=en|zh&category=BTC
 */
import { NextRequest, NextResponse } from 'next/server';
import type { FlashItem } from '@/components/FlashFeed';
import {
  RSS_SOURCES,
  CHINESE_SOURCES,
  BREAKING_KEYWORDS,
  IMPORTANT_KEYWORDS,
  CATEGORY_MAP,
  AI_CONFIG,
  contentHash,
  DATA_API_SOURCES,
} from '@/lib/api/content-sources';

// ─── RSS Parsing ────────────────────────────────────────────
interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  sourceType: 'rss' | 'exchange' | 'foresight' | 'chinese' | 'onchain' | 'data';
  lang: 'en' | 'zh';
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

  // Support both RSS <item> and Atom <entry>
  const itemBlocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) || [];

  for (const block of itemBlocks) {
    const getTag = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? decodeEntities(m[1].trim()) : '';
    };
    // Atom feeds use <link href="..."/>
    const getAtomLink = () => {
      const m = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
      return m ? m[1] : '';
    };

    const title = getTag('title');
    const link = getTag('link') || getAtomLink() || getTag('guid');
    const pubDate = getTag('pubDate') || getTag('dc:date') || getTag('published') || getTag('updated');
    const description = getTag('description') || getTag('content:encoded') || getTag('summary');

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

// ─── Deduplication with Similarity-Based Matching ──────────────────────────────────────────
function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, '') // remove symbols
    .replace(/\s+/g, ' ')                  // normalize spaces
    .trim();
}

function extractKeyEntities(title: string): Set<string> {
  const normalized = normalizeTitleForComparison(title);
  const words = normalized.split(/\s+/);

  // Common stopwords
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'by', 'with', 'from', 'as', 'about', 'more', 'most', 'other', 'some', 'any', 'all', 'each', 'every', 'both', 'neither']);

  return new Set(words.filter(w => w.length > 2 && !stopwords.has(w)));
}

function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set(Array.from(set1).concat(Array.from(set2)));

  return intersection.size / union.size;
}

function deduplicate(items: RawNewsItem[]): RawNewsItem[] {
  if (items.length === 0) return [];

  // Sort by pubDate to keep earliest items
  const sorted = [...items].sort((a, b) => {
    try {
      return new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime();
    } catch {
      return 0;
    }
  });

  const result: RawNewsItem[] = [];
  const seen: Array<{ item: RawNewsItem; entities: Set<string> }> = [];

  for (const item of sorted) {
    if (item.title.length < 5) continue;

    const entities = extractKeyEntities(item.title);

    // Check for similarity with existing items
    let isSimilar = false;
    for (const seen_entry of seen) {
      const similarity = jaccardSimilarity(entities, seen_entry.entities);
      if (similarity >= 0.6) {
        isSimilar = true;
        break;
      }
    }

    if (!isSimilar) {
      seen.push({ item, entities });
      result.push(item);
    }
  }

  return result;
}

// ─── Source Fetchers ────────────────────────────────────────

async function fetchRSS(url: string, name: string, lang: 'en' | 'zh' = 'en'): Promise<RawNewsItem[]> {
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
      lang,
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
          lang: 'en',
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
          lang: 'en',
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

async function fetchBybitAnnouncements(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto&limit=10',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result?.list || [];
    return (Array.isArray(items) ? items : []).map((a: Record<string, string>) => ({
      title: a.title || '',
      link: a.url || `https://announcements.bybit.com`,
      pubDate: a.publishTime ? new Date(Number(a.publishTime)).toISOString() : new Date().toISOString(),
      description: a.description || a.title || '',
      source: 'Bybit',
      sourceType: 'exchange' as const,
      lang: 'en' as const,
      forceCategory: 'Exchange',
      forceLevel: 'orange' as const,
    }));
  } catch {
    console.warn('[Exchange] Bybit fetch failed');
    return [];
  }
}

async function fetchChineseSources(): Promise<RawNewsItem[]> {
  const results: RawNewsItem[] = [];

  // Foresight News (RSS first, API fallback)
  try {
    const res = await fetch('https://foresightnews.pro/rss', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSSXML(xml).map(item => ({
        ...item,
        source: 'Foresight News',
        sourceType: 'foresight' as const,
        lang: 'zh' as const,
      }));
      results.push(...items);
    }
  } catch { /* fallthrough */ }

  if (results.filter(r => r.source === 'Foresight News').length === 0) {
    try {
      const res = await fetch('https://foresightnews.pro/api/v1/news?pageSize=20', {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const news = data?.data?.list || data?.data || [];
        const items = (Array.isArray(news) ? news : []).map((item: Record<string, string>) => ({
          title: item.title || item.content?.slice(0, 100) || '',
          link: item.url || `https://foresightnews.pro/news/detail/${item.id}`,
          pubDate: item.publishTime || item.createdAt || new Date().toISOString(),
          description: item.content?.slice(0, 300) || item.title || '',
          source: 'Foresight News',
          sourceType: 'foresight' as const,
          lang: 'zh' as const,
        }));
        results.push(...items);
      }
    } catch {
      console.warn('[Foresight] All fetch methods failed');
    }
  }

  // Other Chinese RSS sources
  const chineseRSS = CHINESE_SOURCES.filter(s => s.type === 'rss' && (s.name as string) !== 'ForesightNews');
  const rssPromises = chineseRSS.map(s =>
    fetchRSS('url' in s ? s.url : '', s.name, 'zh')
  );
  const rssResults = await Promise.allSettled(rssPromises);
  for (const result of rssResults) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  }

  return results;
}

// ─── Data API Fetchers ──────────────────────────────────────

async function fetchDeFiLlama(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch('https://api.llama.fi/protocols', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const protocols = await res.json();

    const items: RawNewsItem[] = [];
    const now = Date.now();

    // Look for protocols with significant TVL changes
    for (const proto of protocols.slice(0, 30)) {
      const change24h = proto.change_24h || 0;
      if (Math.abs(change24h) > 5) {
        const direction = change24h > 0 ? 'surges' : 'drops';
        const tvl = proto.tvl ? `$${(proto.tvl / 1e9).toFixed(2)}B` : 'unknown';
        items.push({
          title: `DeFi Protocol ${proto.name} TVL ${direction} ${Math.abs(change24h).toFixed(1)}% to ${tvl}`,
          link: `https://defillama.com/protocol/${proto.slug}`,
          pubDate: new Date(now).toISOString(),
          description: `${proto.name} shows ${direction} TVL changes in the last 24 hours`,
          source: 'DeFi Llama',
          sourceType: 'data',
          lang: 'en',
          forceCategory: 'DeFi',
          forceLevel: 'orange',
        });
      }
    }

    return items;
  } catch {
    console.warn('[Data API] DeFi Llama fetch failed');
    return [];
  }
}

async function fetchFearGreedIndex(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch('https://api.alternative.me/fng/', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    const current = data?.data?.[0];
    if (!current) return [];

    const value = Number(current.value);
    let sentiment = 'Neutral';
    if (value < 25) sentiment = 'Extreme Fear';
    else if (value < 45) sentiment = 'Fear';
    else if (value < 55) sentiment = 'Neutral';
    else if (value < 75) sentiment = 'Greed';
    else sentiment = 'Extreme Greed';

    return [{
      title: `Crypto Fear & Greed Index: ${value} (${sentiment})`,
      link: 'https://alternative.me/crypto/fear-and-greed-index/',
      pubDate: new Date().toISOString(),
      description: `Current sentiment index at ${value} - ${sentiment}`,
      source: 'Fear & Greed Index',
      sourceType: 'data',
      lang: 'en',
      forceCategory: 'Sentiment',
      forceLevel: 'blue',
    }];
  } catch {
    console.warn('[Data API] Fear & Greed Index fetch failed');
    return [];
  }
}

async function fetchEthereumGas(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json();

    const safegasprice = Number(data?.result?.SafeGasPrice || 0);
    if (safegasprice < 50) return [];

    return [{
      title: `Ethereum Gas Spikes to ${safegasprice} Gwei`,
      link: 'https://etherscan.io/gastracker',
      pubDate: new Date().toISOString(),
      description: `Current safe gas price: ${safegasprice} Gwei`,
      source: 'Etherscan Gas Tracker',
      sourceType: 'data',
      lang: 'en',
      forceCategory: 'ETH',
      forceLevel: 'orange',
    }];
  } catch {
    console.warn('[Data API] Etherscan gas fetch failed');
    return [];
  }
}

async function fetchCoinGlassLiquidations(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      'https://open-api.coinglass.com/public/v2/liquidation_history',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json();

    const history = data?.data;
    if (!Array.isArray(history) || history.length === 0) return [];

    // Get total liquidations in last 24h
    const now = Date.now();
    const last24h = history.filter((h: Record<string, number>) => {
      const time = h.create_time || 0;
      return (now - time * 1000) < 86400000;
    });

    let totalLiquidated = 0;
    for (const item of last24h) {
      totalLiquidated += item.liquidation_amount_usd || 0;
    }

    if (totalLiquidated > 100000000) {
      const amountB = (totalLiquidated / 1e9).toFixed(2);
      return [{
        title: `Crypto Liquidations Hit $${amountB}B in Past 24h`,
        link: 'https://www.coinglass.com/liquidation',
        pubDate: new Date().toISOString(),
        description: `Significant liquidation event detected across crypto markets`,
        source: 'CoinGlass',
        sourceType: 'data',
        lang: 'en',
        forceCategory: 'Risk',
        forceLevel: 'orange',
      }];
    }

    return [];
  } catch {
    console.warn('[Data API] CoinGlass fetch failed');
    return [];
  }
}

async function fetchFedAnnouncements(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      'https://www.federalreserve.gov/feeds/press_all.xml',
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'HashSpring/1.0' },
      },
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const items = parseRSSXML(xml);
    const now = Date.now();

    // Filter for last 48 hours
    const recent = items.filter(item => {
      try {
        const itemTime = new Date(item.pubDate).getTime();
        return (now - itemTime) < 172800000; // 48 hours
      } catch {
        return false;
      }
    });

    // Filter for FOMC/policy keywords
    const policy = recent.filter(item =>
      /fomc|federal open|policy|interest rate|statement/i.test(item.title)
    );

    return policy.map(item => ({
      ...item,
      source: 'US Federal Reserve',
      sourceType: 'data' as const,
      lang: 'en' as const,
      forceCategory: 'Policy',
      forceLevel: 'red' as const,
    }));
  } catch {
    console.warn('[Data API] Fed RSS fetch failed');
    return [];
  }
}

async function fetchSECEDGAR(): Promise<RawNewsItem[]> {
  try {
    // Build date range for last 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const enddt = now.toISOString().split('T')[0];
    const startdt = yesterday.toISOString().split('T')[0];

    const url = `https://efts.sec.gov/LATEST/search-index?q=%22crypto%22&dateRange=custom&startdt=${startdt}&enddt=${enddt}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });

    if (!res.ok) return [];
    const text = await res.text();

    // Extract filing information from HTML
    const filingMatches = text.match(/<a[^>]+href="([^"]*)"[^>]*>([^<]+)<\/a>/gi) || [];
    const items: RawNewsItem[] = [];

    for (const match of filingMatches.slice(0, 5)) {
      const parts = match.match(/href="([^"]*)"[^>]*>([^<]+)</);
      if (parts) {
        items.push({
          title: `SEC EDGAR: ${parts[2].trim().slice(0, 80)}`,
          link: `https://www.sec.gov${parts[1]}`,
          pubDate: new Date().toISOString(),
          description: `New crypto-related filing on SEC EDGAR`,
          source: 'SEC EDGAR',
          sourceType: 'data',
          lang: 'en',
          forceCategory: 'Regulatory',
          forceLevel: 'orange',
        });
      }
    }

    return items;
  } catch {
    console.warn('[Data API] SEC EDGAR fetch failed');
    return [];
  }
}

async function fetchTokenUnlocks(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch('https://token.unlocks.app/api', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const unlocks = Array.isArray(data) ? data : data?.unlocks || [];

    const items: RawNewsItem[] = [];
    const now = Date.now();

    // Find significant unlocks in next 7 days
    for (const unlock of unlocks.slice(0, 10)) {
      const unlockTime = unlock.date ? new Date(unlock.date).getTime() : 0;
      const daysUntil = (unlockTime - now) / 86400000;

      if (daysUntil > 0 && daysUntil < 7) {
        const amount = unlock.amount ? (unlock.amount / 1e6).toFixed(2) : 'unknown';
        items.push({
          title: `Large Token Unlock: ${unlock.token || 'Token'} - ${amount}M tokens in ${Math.ceil(daysUntil)} days`,
          link: 'https://token.unlocks.app',
          pubDate: new Date(now).toISOString(),
          description: `Upcoming token unlock event`,
          source: 'Token Unlocks',
          sourceType: 'data',
          lang: 'en',
          forceCategory: 'Token Events',
          forceLevel: 'orange',
        });
      }
    }

    return items;
  } catch {
    // Token Unlocks may require auth - fail silently
    return [];
  }
}

async function fetchChineseDataSources(): Promise<RawNewsItem[]> {
  const results: RawNewsItem[] = [];

  // 金色财经 (Jinse)
  try {
    const res = await fetch('https://www.jinse.cn/rss', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSSXML(xml);
      results.push(...items.map(item => ({
        ...item,
        source: '金色财经',
        sourceType: 'data' as const,
        lang: 'zh' as const,
      })));
    }
  } catch {
    console.warn('[Data API] 金色财经 fetch failed');
  }

  // 吴说区块链 (Wu Block - Substack)
  try {
    const res = await fetch('https://wublock.substack.com/feed', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    });
    if (res.ok) {
      const xml = await res.text();
      const items = parseRSSXML(xml);
      results.push(...items.map(item => ({
        ...item,
        source: '吴说区块链',
        sourceType: 'data' as const,
        lang: 'zh' as const,
      })));
    }
  } catch {
    console.warn('[Data API] 吴说区块链 fetch failed');
  }

  return results;
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

    const lines = text.split('\n').filter((l: string) => l.trim());
    const translations: string[] = [];
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      translations.push(match ? match[1].trim() : line.trim());
    }

    return titles.map((original, i) => translations[i] || original);
  } catch {
    return titles;
  }
}

async function translateTitlesToEn(titles: string[]): Promise<string[]> {
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
        system: `You are a professional crypto news translator for HashSpring.
Rules:
- Translate Chinese headlines to English
- Keep crypto terms: DeFi, ETF, BTC, ETH, NFT, L2, TVL, DEX, etc.
- Keep brand names: Binance, Coinbase, Uniswap, etc.
- Keep ticker symbols: $BTC, $ETH, $SOL
- Preserve numbers, dates, percentages
- Use professional news tone
- Output ONLY the translation, no explanations`,
        messages: [{
          role: 'user',
          content: `Translate these Chinese crypto news headlines to English. Return numbered list, same order:\n\n${numbered}`,
        }],
      }),
    });

    if (!res.ok) return titles;
    const data = await res.json();
    const text: string = data.content?.[0]?.text || '';

    const lines = text.split('\n').filter((l: string) => l.trim());
    const translations: string[] = [];
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      translations.push(match ? match[1].trim() : line.trim());
    }

    return titles.map((original, i) => translations[i] || original);
  } catch {
    return titles;
  }
}

// ─── Supabase Reader (优先数据源) ─────────────────────────────
async function fetchFromSupabase(locale: string, categoryFilter: string | null): Promise<FlashItem[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    // 直接用 REST API 查询，不需要安装 SDK
    const params = new URLSearchParams({
      select: 'content_hash,title,title_en,title_zh,description,link,source,source_type,category,level,pub_date,lang',
      order: 'pub_date.desc',
      limit: '50',
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/flash_news?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 15 }, // 15秒缓存
    });

    if (!res.ok) {
      console.warn(`[Flash API] Supabase query failed: ${res.status}`);
      return null;
    }

    const rows: Array<{
      content_hash: string;
      title: string;
      title_en: string;
      title_zh: string;
      description: string;
      link: string;
      source: string;
      source_type: string;
      category: string;
      level: string;
      pub_date: string;
      lang: string;
    }> = await res.json();

    if (!rows || rows.length === 0) return null;

    let items: FlashItem[] = rows.map(row => {
      // 提取干净的摘要（去掉原文来源标记，限制120字符）
      let desc = (row.description || '').split('\n\n📰')[0].trim();
      if (desc.length > 120) desc = desc.slice(0, 117) + '...';

      return {
        id: row.content_hash || contentHash(row.title, row.source),
        level: (row.level === 'red' || row.level === 'orange' || row.level === 'blue') ? row.level : 'blue',
        time: relativeTime(row.pub_date, locale),
        title: locale === 'zh' ? (row.title_zh || row.title) : (row.title_en || row.title),
        description: desc || undefined,
        category: row.category || 'Crypto',
        source: row.source,
        link: row.link,
      };
    });

    // 按 level 排序：red 在前
    items.sort((a, b) => {
      const levelOrder: Record<string, number> = { red: 0, orange: 1, blue: 2 };
      return (levelOrder[a.level] || 2) - (levelOrder[b.level] || 2);
    });

    // 按分类过滤
    if (categoryFilter && categoryFilter !== 'All') {
      items = items.filter(item => item.category === categoryFilter);
    }

    return items.slice(0, 30);
  } catch (err) {
    console.warn('[Flash API] Supabase fallback triggered:', err);
    return null;
  }
}

// ─── Main API Handler ───────────────────────────────────────
export const revalidate = 15; // 15s ISR cache — Supabase 数据更新更快

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';
  const categoryFilter = request.nextUrl.searchParams.get('category');

  // ✅ 优先从 Supabase 读取 worker 写入的数据
  const supabaseItems = await fetchFromSupabase(locale, categoryFilter);
  if (supabaseItems && supabaseItems.length > 0) {
    return NextResponse.json(supabaseItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        'X-Source': 'supabase',
        'X-Count': String(supabaseItems.length),
      },
    });
  }

  // ⚠️ Supabase 失败或为空 → 回退到直接抓取（保证网站稳定性）
  console.warn('[Flash API] Supabase unavailable, falling back to direct fetch');

  try {
    // Fetch all pillars in parallel
    const [
      rssResults,
      exchangeResults,
      bybitResults,
      chineseResults,
      defiLlamaResults,
      fearGreedResults,
      gasResults,
      coingrassResults,
      fedResults,
      secResults,
      tokenUnlocksResults,
      chineseDataResults,
    ] = await Promise.all([
      // 1. English RSS
      Promise.all(RSS_SOURCES.map(s => fetchRSS(s.url, s.name, 'en'))),
      // 2. Binance
      fetchBinanceAnnouncements(),
      // 3. Bybit
      fetchBybitAnnouncements(),
      // 4. Chinese sources
      fetchChineseSources(),
      // 5. Data API sources
      fetchDeFiLlama(),
      fetchFearGreedIndex(),
      fetchEthereumGas(),
      fetchCoinGlassLiquidations(),
      fetchFedAnnouncements(),
      fetchSECEDGAR(),
      fetchTokenUnlocks(),
      fetchChineseDataSources(),
    ]);

    // Merge all sources
    const allItems: RawNewsItem[] = [
      ...rssResults.flat(),
      ...exchangeResults,
      ...bybitResults,
      ...chineseResults,
      ...defiLlamaResults,
      ...fearGreedResults,
      ...gasResults,
      ...coingrassResults,
      ...fedResults,
      ...secResults,
      ...tokenUnlocksResults,
      ...chineseDataResults,
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

    // Take top 50 items
    const top = unique.slice(0, 50);

    // Convert to FlashItem format with STABLE IDs (slug + hash)
    let flashItems: FlashItem[] = top.map((item) => {
      let desc = (item.description || '').trim();
      if (desc.length > 120) desc = desc.slice(0, 117) + '...';
      return {
        id: contentHash(item.title, item.source),
        level: classifyLevel(item.title, item.forceLevel),
        time: relativeTime(item.pubDate, locale),
        title: item.title,
        description: desc || undefined,
        category: classifyCategory(item.title, item.forceCategory),
        source: item.source,
        link: item.link,
      };
    });

    // Boost: red-level items to top
    flashItems.sort((a, b) => {
      const levelOrder = { red: 0, orange: 1, blue: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });

    // Filter by category if requested
    if (categoryFilter && categoryFilter !== 'All') {
      flashItems = flashItems.filter(item => item.category === categoryFilter);
    }

    // Limit to 30
    flashItems = flashItems.slice(0, 30);

    // AI Translation based on locale
    if (locale === 'zh') {
      // Translate English titles → Chinese
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
    } else {
      // Translate Chinese titles → English
      const needTranslation: number[] = [];
      const titlesToTranslate: string[] = [];

      flashItems.forEach((item, i) => {
        const hasChinese = /[\u4e00-\u9fff]/.test(item.title);
        if (hasChinese) {
          needTranslation.push(i);
          titlesToTranslate.push(item.title);
        }
      });

      if (titlesToTranslate.length > 0) {
        const translated = await translateTitlesToEn(titlesToTranslate);
        needTranslation.forEach((itemIdx, transIdx) => {
          flashItems[itemIdx] = { ...flashItems[itemIdx], title: translated[transIdx] };
        });
      }
    }

    const enCount = rssResults.flat().length;
    const exCount = exchangeResults.length + bybitResults.length;
    const zhCount = chineseResults.length;

    return NextResponse.json(flashItems, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Source': 'direct-fetch-fallback',
        'X-Sources': `en:${enCount},exchange:${exCount},zh:${zhCount},total:${allItems.length},unique:${unique.length}`,
      },
    });
  } catch (error) {
    console.error('[Flash API] Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
