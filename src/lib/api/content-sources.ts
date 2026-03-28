/**
 * HashSpring Content Sources Configuration
 *
 * Three pillars of content:
 * 1. Mainstream Crypto Media — RSS feeds from top publications
 * 2. Exchange Announcements — Binance (spot/Alpha/futures), OKX, Coinbase
 * 3. Foresight News — Chinese crypto flash news aggregator
 */

// ============================================================
// 1. MAINSTREAM CRYPTO MEDIA (RSS Feeds)
// ============================================================
export const RSS_SOURCES = [
  // Tier 1 — Primary sources (highest priority)
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', tier: 1 },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', tier: 1 },
  { url: 'https://www.theblock.co/rss.xml', name: 'TheBlock', tier: 1 },

  // Tier 2 — Secondary sources
  { url: 'https://decrypt.co/feed', name: 'Decrypt', tier: 2 },
  { url: 'https://bitcoinmagazine.com/.rss/full/', name: 'BitcoinMag', tier: 2 },
  { url: 'https://www.dlnews.com/arc/outboundfeeds/rss/', name: 'DLNews', tier: 2 },
  { url: 'https://blockworks.co/feed', name: 'Blockworks', tier: 2 },

  // Tier 3 — Supplementary
  { url: 'https://cryptoslate.com/feed/', name: 'CryptoSlate', tier: 3 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/category/markets/', name: 'CoinDesk-Markets', tier: 3 },
] as const;

// ============================================================
// 2. EXCHANGE ANNOUNCEMENTS
// ============================================================
export const EXCHANGE_SOURCES = [
  // Binance — multiple announcement feeds
  {
    name: 'Binance-Listing',
    url: 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=10',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['Binance', 'Listing', 'New'],
    level: 'red' as const,
  },
  {
    name: 'Binance-Futures',
    url: 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=130&pageNo=1&pageSize=10',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['Binance', 'Futures', 'Contract'],
    level: 'orange' as const,
  },
  {
    name: 'Binance-Alpha',
    url: 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=10',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['Binance', 'Alpha'],
    level: 'orange' as const,
  },
  // OKX Announcements
  {
    name: 'OKX-Listing',
    url: 'https://www.okx.com/v2/support/home/web',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['OKX', 'Listing'],
    level: 'orange' as const,
  },
] as const;

// ============================================================
// 3. FORESIGHT NEWS (Chinese Crypto Flash News)
// ============================================================
export const FORESIGHT_SOURCES = [
  {
    name: 'ForesightNews',
    url: 'https://foresightnews.pro/api/v1/news?pageSize=20',
    type: 'json' as const,
    category: 'Crypto',
    tags: ['Foresight', 'Flash'],
  },
  {
    name: 'ForesightNews-RSS',
    url: 'https://foresightnews.pro/rss',
    type: 'rss' as const,
    category: 'Crypto',
    tags: ['Foresight'],
  },
] as const;

// ============================================================
// CLASSIFICATION SYSTEM
// ============================================================

// Breaking news = RED (urgent, market-moving)
export const BREAKING_KEYWORDS = [
  'surge', 'crash', 'hack', 'exploit', 'record', 'all-time', 'ath',
  'ban', 'approve', 'sec', 'arrest', 'collapse', 'billion', 'emergency',
  'halt', 'breach', 'list', '上线', '上市', '暴跌', '暴涨', '突破',
  '创新高', '被盗', '攻击', '通过', '批准', '禁止', '紧急',
];

// Important = ORANGE
export const IMPORTANT_KEYWORDS = [
  'launch', 'partner', 'acquire', 'funding', 'regulation', 'update',
  'upgrade', 'milestone', 'integration', 'announce', 'raise', 'ipo',
  'airdrop', 'testnet', 'mainnet', 'snapshot',
  '发布', '合作', '收购', '融资', '监管', '升级', '空投', '测试网', '主网',
];

// Category detection (English + Chinese keywords)
export const CATEGORY_MAP: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'satoshi', 'halving', 'microstrategy', '比特币', '减半'],
  'ETH': ['ethereum', 'eth', 'vitalik', 'erc', 'pectra', '以太坊'],
  'DeFi': ['defi', 'dex', 'lending', 'yield', 'tvl', 'uniswap', 'aave', 'compound', 'curve', 'makerdao', '去中心化金融'],
  'NFT': ['nft', 'opensea', 'collection', 'mint', 'blur', 'pudgy'],
  'L2': ['layer 2', 'layer2', 'rollup', 'arbitrum', 'optimism', 'base', 'zk', 'polygon', 'starknet', 'scroll'],
  'Policy': ['sec', 'regulation', 'law', 'compliance', 'congress', 'mica', 'license', '监管', '法规', '合规', 'cftc'],
  'SOL': ['solana', 'sol', 'jupiter', 'jito', 'raydium'],
  'Stable': ['stablecoin', 'usdt', 'usdc', 'tether', 'circle', 'dai', 'paypal', '稳定币'],
  'AI': ['artificial intelligence', 'ai agent', 'gpu', 'compute', 'render', 'worldcoin', 'fetch.ai', 'bittensor'],
  'Exchange': ['binance', 'coinbase', 'kraken', 'okx', 'bybit', 'upbit', 'bitget', '交易所', '上线', 'listing'],
  'Meme': ['meme', 'doge', 'shiba', 'pepe', 'bonk', 'wif', 'floki'],
};

// ============================================================
// AI CONTENT PIPELINE CONFIG
// ============================================================
export const AI_CONFIG = {
  // Translation model (fast, cheap)
  translationModel: 'claude-haiku-4-5-20251001',
  // Summary/rewrite model (higher quality)
  contentModel: 'claude-sonnet-4-20250514',
  // Max concurrent translations
  maxConcurrent: 5,
  // Translation target
  targetLang: 'Traditional Chinese (繁體中文)',
  // System prompt for translation
  translationPrompt: `You are a professional crypto news translator for HashSpring.
Rules:
- Translate to Traditional Chinese (繁體中文), NOT Simplified Chinese (简体)
- Keep crypto terms in English: DeFi, ETF, BTC, ETH, NFT, L2, TVL, DEX, etc.
- Keep brand names in English: Binance, Coinbase, Uniswap, etc.
- Keep ticker symbols: $BTC, $ETH, $SOL
- Preserve numbers, dates, percentages
- Use professional news tone
- Output ONLY the translation, no explanations`,
};
