/**
 * HashSpring News Fetcher
 *
 * Fetches crypto news from RSS feeds and prepares them
 * for AI translation + publishing pipeline.
 *
 * Usage: npx tsx scripts/fetch-news.ts
 *
 * In production, this runs as a cron job every 5 minutes.
 */

// ====== RSS Feed Sources ======
const RSS_SOURCES = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', priority: 1 },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', priority: 1 },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml', priority: 1 },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', priority: 2 },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', priority: 2 },
  { name: 'DeFi Llama News', url: 'https://feed.defillama.com/', priority: 2 },
];

// ====== Flash Level Classification Keywords ======
const BREAKING_KEYWORDS = [
  'surge', 'crash', 'hack', 'exploit', 'record', 'all-time', 'ban',
  'approve', 'SEC', 'arrest', 'collapse', 'billion', 'emergency',
];

const IMPORTANT_KEYWORDS = [
  'launch', 'partner', 'acquire', 'funding', 'regulation', 'update',
  'upgrade', 'milestone', 'integration', 'announce',
];

// ====== Category Detection ======
const CATEGORY_MAP: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'satoshi', 'halving'],
  'ETH': ['ethereum', 'eth', 'vitalik', 'erc-20'],
  'DeFi': ['defi', 'dex', 'lending', 'yield', 'tvl', 'uniswap', 'aave'],
  'NFT': ['nft', 'opensea', 'collection', 'mint'],
  'L2': ['layer 2', 'rollup', 'arbitrum', 'optimism', 'base', 'zk'],
  'Policy': ['sec', 'regulation', 'law', 'compliance', 'congress', 'mica'],
  'SOL': ['solana', 'sol'],
  'Stable': ['stablecoin', 'usdt', 'usdc', 'tether', 'circle'],
};

interface RawArticle {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface FlashNewsItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  title: string;
  titleZh?: string;
  category: string;
  source: string;
  sourceUrl: string;
  pubDate: string;
  summary: string;
  summaryZh?: string;
}

// ====== Utility Functions ======

function classifyLevel(title: string, description: string): 'red' | 'orange' | 'blue' {
  const text = `${title} ${description}`.toLowerCase();
  if (BREAKING_KEYWORDS.some((kw) => text.includes(kw))) return 'red';
  if (IMPORTANT_KEYWORDS.some((kw) => text.includes(kw))) return 'orange';
  return 'blue';
}

function detectCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return 'Crypto';
}

function generateId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ====== Simple XML Parser (no deps) ======

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  // Handle CDATA
  const val = match[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1].trim() : val;
}

function parseRSSItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  const itemMatches = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) || [];
  for (const itemXml of itemMatches) {
    items.push({
      title: extractTag(itemXml, 'title'),
      link: extractTag(itemXml, 'link'),
      pubDate: extractTag(itemXml, 'pubDate'),
      description: extractTag(itemXml, 'description').replace(/<[^>]+>/g, '').slice(0, 300),
    });
  }
  return items;
}

// ====== AI Translation via Anthropic Claude API ======

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function translateToZh(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return `[需設定 ANTHROPIC_API_KEY] ${text}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: 'You are a crypto news translator. Translate the following English text to Traditional Chinese (繁體中文). Keep crypto terms like DeFi, ETF, BTC in English. Output ONLY the translation, nothing else.',
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) {
      console.error(`Translation API error: ${response.status}`);
      return text;
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || text;
  } catch (err) {
    console.error('Translation failed:', err);
    return text;
  }
}

// ====== Main Fetch Pipeline ======

async function fetchSource(source: { name: string; url: string; priority: number }): Promise<RawArticle[]> {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'HashSpring/1.0 (crypto news aggregator)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseRSSItems(xml);
    return items.map((item) => ({ ...item, source: source.name }));
  } catch (err) {
    console.error(`[${source.name}] Fetch failed:`, err);
    return [];
  }
}

async function processArticle(raw: RawArticle): Promise<FlashNewsItem> {
  const level = classifyLevel(raw.title, raw.description);
  const category = detectCategory(raw.title, raw.description);
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return {
    id: generateId(raw.title),
    level,
    title: raw.title,
    titleZh: hasApiKey ? await translateToZh(raw.title) : undefined,
    category,
    source: raw.source,
    sourceUrl: raw.link,
    pubDate: raw.pubDate || new Date().toISOString(),
    summary: raw.description.slice(0, 200),
    summaryZh: hasApiKey ? await translateToZh(raw.description.slice(0, 200)) : undefined,
  };
}

async function main() {
  console.log('🚀 HashSpring News Fetcher starting...');
  console.log(`📡 Fetching from ${RSS_SOURCES.length} sources...\n`);

  // Fetch all sources in parallel
  const results = await Promise.all(RSS_SOURCES.map(fetchSource));
  const allArticles = results.flat();

  console.log(`📰 Fetched ${allArticles.length} total articles\n`);

  // Deduplicate by title similarity (basic)
  const seen = new Set<string>();
  const unique = allArticles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`🔍 ${unique.length} unique articles after dedup\n`);

  // Process & classify
  const flashItems = await Promise.all(unique.slice(0, 20).map(processArticle));

  // Sort: red first, then orange, then blue
  const levelOrder = { red: 0, orange: 1, blue: 2 };
  flashItems.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  // Output
  console.log('═══════════════════════════════════════');
  console.log(' FLASH NEWS ITEMS');
  console.log('═══════════════════════════════════════\n');

  for (const item of flashItems) {
    const emoji = item.level === 'red' ? '🔴' : item.level === 'orange' ? '🟠' : '🔵';
    console.log(`${emoji} [${item.category}] ${item.title}`);
    console.log(`   Source: ${item.source} | ${item.sourceUrl}`);
    console.log('');
  }

  // In production: save to database (PostgreSQL / Strapi CMS)
  // await db.flashNews.createMany({ data: flashItems });

  console.log(`\n✅ Processed ${flashItems.length} flash news items`);
  console.log('💡 To enable translation, set ANTHROPIC_API_KEY env variable');
}

main().catch(console.error);
