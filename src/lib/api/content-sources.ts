/**
 * HashSpring Content Sources Configuration
 *
 * Five pillars of content:
 * 1. Mainstream Crypto Media — English RSS feeds from top publications
 * 2. Chinese Crypto Media — Chinese-language RSS/API feeds
 * 3. Exchange Announcements — Binance, OKX, Coinbase, Bybit, Bitget
 * 4. On-chain / Data Sources — Whale alerts, governance, DeFi
 * 5. AI Content Pipeline — Translation, SEO optimization, summary generation
 */

// ============================================================
// 1. MAINSTREAM CRYPTO MEDIA (English RSS Feeds)
// ============================================================
export const RSS_SOURCES = [
  // ── Tier 1 — Top-tier breaking news (highest priority) ──
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', tier: 1, lang: 'en' },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', tier: 1, lang: 'en' },
  { url: 'https://www.theblock.co/rss.xml', name: 'TheBlock', tier: 1, lang: 'en' },

  // ── Tier 2 — Quality secondary sources ──
  { url: 'https://decrypt.co/feed', name: 'Decrypt', tier: 2, lang: 'en' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', name: 'BitcoinMag', tier: 2, lang: 'en' },
  { url: 'https://www.dlnews.com/arc/outboundfeeds/rss/', name: 'DLNews', tier: 2, lang: 'en' },
  { url: 'https://blockworks.co/feed', name: 'Blockworks', tier: 2, lang: 'en' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/category/markets/', name: 'CoinDesk-Markets', tier: 2, lang: 'en' },

  // ── Tier 3 — Supplementary & specialized ──
  { url: 'https://cryptoslate.com/feed/', name: 'CryptoSlate', tier: 3, lang: 'en' },
  { url: 'https://cryptopotato.com/feed/', name: 'CryptoPotato', tier: 3, lang: 'en' },
  { url: 'https://beincrypto.com/feed/', name: 'BeInCrypto', tier: 3, lang: 'en' },
  { url: 'https://u.today/rss', name: 'UToday', tier: 3, lang: 'en' },
  { url: 'https://ambcrypto.com/feed/', name: 'AMBCrypto', tier: 3, lang: 'en' },
  { url: 'https://www.newsbtc.com/feed/', name: 'NewsBTC', tier: 3, lang: 'en' },
  { url: 'https://dailyhodl.com/feed/', name: 'DailyHodl', tier: 3, lang: 'en' },
  { url: 'https://bitcoinist.com/feed/', name: 'Bitcoinist', tier: 3, lang: 'en' },

  // ── Tier 4 — DeFi / NFT / Layer2 specialized ──
  { url: 'https://thedefiant.io/feed', name: 'TheDefiant', tier: 4, lang: 'en' },
  { url: 'https://www.nftgators.com/feed/', name: 'NFTGators', tier: 4, lang: 'en' },
  { url: 'https://rss.app/feeds/v1.1/dWqVrZFhYwT0MNCG.json', name: 'L2Beat-Blog', tier: 4, lang: 'en' },
] as const;

// ============================================================
// 2. CHINESE CRYPTO MEDIA
// ============================================================
export const CHINESE_SOURCES = [
  // ── Flash News Aggregators ──
  {
    name: 'ForesightNews',
    url: 'https://foresightnews.pro/api/v1/news?pageSize=20',
    rssUrl: 'https://foresightnews.pro/rss',
    type: 'json' as const,
    lang: 'zh',
  },
  {
    name: 'PANews',
    url: 'https://www.panewslab.com/rss/zh/index.xml',
    type: 'rss' as const,
    lang: 'zh',
  },
  {
    name: 'ChainCatcher',
    url: 'https://www.chaincatcher.com/rss',
    type: 'rss' as const,
    lang: 'zh',
  },
  {
    name: 'BlockBeats',
    url: 'https://www.theblockbeats.info/rss',
    type: 'rss' as const,
    lang: 'zh',
  },
  {
    name: 'Odaily',
    url: 'https://www.odaily.news/rss',
    type: 'rss' as const,
    lang: 'zh',
  },
  {
    name: 'TechFlow',
    url: 'https://www.techflowpost.com/rss',
    type: 'rss' as const,
    lang: 'zh',
  },
  {
    name: 'MarsBit',
    url: 'https://news.marsbit.co/rss',
    type: 'rss' as const,
    lang: 'zh',
  },
] as const;

// ============================================================
// 3. EXCHANGE ANNOUNCEMENTS
// ============================================================
export const EXCHANGE_SOURCES = [
  // ── Binance ──
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
  // ── OKX ──
  {
    name: 'OKX-Listing',
    url: 'https://www.okx.com/v2/support/home/web',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['OKX', 'Listing'],
    level: 'orange' as const,
  },
  // ── Bybit ──
  {
    name: 'Bybit-Listing',
    url: 'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['Bybit', 'Listing'],
    level: 'orange' as const,
  },
  // ── Bitget ──
  {
    name: 'Bitget-Listing',
    url: 'https://api.bitget.com/api/v2/public/annoucements?language=en_US&annType=coin_listings',
    type: 'json' as const,
    category: 'Exchange',
    tags: ['Bitget', 'Listing'],
    level: 'orange' as const,
  },
  // ── Coinbase ──
  {
    name: 'Coinbase-Blog',
    url: 'https://www.coinbase.com/blog/rss.xml',
    type: 'rss' as const,
    category: 'Exchange',
    tags: ['Coinbase'],
    level: 'blue' as const,
  },
] as const;

// ============================================================
// 4. ON-CHAIN & DATA SOURCES
// ============================================================
export const ONCHAIN_SOURCES = [
  {
    name: 'WhaleAlert',
    url: 'https://api.whale-alert.io/feed/rss',
    type: 'rss' as const,
    category: 'On-Chain',
    tags: ['Whale', 'Transfer'],
    level: 'orange' as const,
  },
  {
    name: 'Snapshot-Governance',
    url: 'https://hub.snapshot.org/graphql',
    type: 'graphql' as const,
    category: 'DeFi',
    tags: ['Governance', 'DAO', 'Vote'],
    level: 'blue' as const,
  },
] as const;

// ============================================================
// 5. FREE DATA API SOURCES (JSON/REST endpoints)
// ============================================================
export const DATA_API_SOURCES = [
  // ── DeFi Protocol Data ──
  {
    name: 'DeFi Llama',
    url: 'https://api.llama.fi/protocols',
    type: 'json' as const,
    category: 'DeFi',
    tags: ['TVL', 'DeFi', 'Protocol'],
    level: 'orange' as const,
  },
  // ── Sentiment & Liquidations ──
  {
    name: 'Fear & Greed Index',
    url: 'https://api.alternative.me/fng/',
    type: 'json' as const,
    category: 'Sentiment',
    tags: ['Sentiment', 'Index'],
    level: 'blue' as const,
  },
  {
    name: 'CoinGlass',
    url: 'https://open-api.coinglass.com/public/v2/liquidation_history',
    type: 'json' as const,
    category: 'Risk',
    tags: ['Liquidation', 'Risk'],
    level: 'orange' as const,
  },
  // ── Ethereum Network ──
  {
    name: 'Etherscan Gas Tracker',
    url: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
    type: 'json' as const,
    category: 'ETH',
    tags: ['Gas', 'Network', 'ETH'],
    level: 'orange' as const,
  },
  // ── Token Events ──
  {
    name: 'Token Unlocks',
    url: 'https://token.unlocks.app/api',
    type: 'json' as const,
    category: 'Token Events',
    tags: ['Unlock', 'Vesting', 'Token'],
    level: 'orange' as const,
  },
  // ── Government/Regulatory ──
  {
    name: 'US Federal Reserve',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    type: 'rss' as const,
    category: 'Policy',
    tags: ['Fed', 'FOMC', 'Policy'],
    level: 'orange' as const,
  },
  {
    name: 'SEC EDGAR',
    url: 'https://efts.sec.gov/LATEST/search-index',
    type: 'json' as const,
    category: 'Regulatory',
    tags: ['SEC', 'Filing', 'Crypto'],
    level: 'orange' as const,
  },
  // ── Chinese Market News ──
  {
    name: '金色财经',
    url: 'https://www.jinse.cn/rss',
    type: 'rss' as const,
    lang: 'zh',
    category: 'Chinese Market',
    tags: ['Chinese', 'News'],
    level: 'blue' as const,
  },
  {
    name: '吴说区块链',
    url: 'https://wublock.substack.com/feed',
    type: 'rss' as const,
    lang: 'zh',
    category: 'Chinese Market',
    tags: ['Chinese', 'Blockchain'],
    level: 'blue' as const,
  },
] as const;

// ============================================================
// CLASSIFICATION SYSTEM
// ============================================================

// Breaking news = RED (urgent, market-moving)
export const BREAKING_KEYWORDS = [
  // English
  'surge', 'crash', 'hack', 'exploit', 'record', 'all-time', 'ath',
  'ban', 'approve', 'sec', 'arrest', 'collapse', 'billion', 'emergency',
  'halt', 'breach', 'list', 'delist', 'shutdown', 'bankrupt', 'insolvent',
  'etf approved', 'rate cut', 'conviction', 'indictment', 'lawsuit', 'settlement',
  'flash crash', 'circuit breaker', 'short squeeze', 'liquidation',
  // Chinese
  '上线', '上市', '暴跌', '暴涨', '突破', '创新高', '创新低',
  '被盗', '攻击', '通过', '批准', '禁止', '紧急',
  '崩盘', '清算', '跑路', '监管', '逮捕', '判刑',
  '利好', '重大', '突发', '爆仓',
];

// Important = ORANGE
export const IMPORTANT_KEYWORDS = [
  // English
  'launch', 'partner', 'acquire', 'funding', 'regulation', 'update',
  'upgrade', 'milestone', 'integration', 'announce', 'raise', 'ipo',
  'airdrop', 'testnet', 'mainnet', 'snapshot', 'token', 'unlock',
  'stake', 'burn', 'bridge', 'migrate', 'fork', 'proposal', 'vote',
  'revenue', 'profit', 'earnings', 'adoption', 'institutional',
  // Chinese
  '发布', '合作', '收购', '融资', '监管', '升级', '空投',
  '测试网', '主网', '解锁', '质押', '销毁', '跨链',
  '提案', '投票', '收入', '利润', '机构',
];

// ============================================================
// ANALYSIS CONTENT DETECTION
// ============================================================

// Sources that are primarily analysis/research — auto-tag as Analysis
export const ANALYSIS_SOURCES = [
  'Messari', 'Nansen', 'Artemis', 'CryptoQuant', 'Bankless',
  'Delphi Digital', 'Glassnode', 'IntoTheBlock', 'Chainalysis',
];

// Title keywords that indicate analysis content (case-insensitive)
export const ANALYSIS_KEYWORDS = [
  // English
  'analysis', 'report', 'research', 'outlook', 'forecast', 'prediction',
  'deep dive', 'breakdown', 'explained', 'thesis', 'macro', 'cycle',
  'on-chain data', 'metrics', 'indicator', 'sentiment', 'trend',
  'bull case', 'bear case', 'risk assessment', 'market structure',
  'weekly review', 'monthly report', 'quarterly', 'annual report',
  'whale activity', 'flow analysis', 'derivatives data', 'funding rate',
  'technical analysis', 'price target', 'support', 'resistance',
  // Chinese
  '分析', '研报', '研究', '深度', '展望', '预测', '观点',
  '报告', '趋势', '周报', '月报', '年报', '指标',
  '链上数据', '市场结构', '技术分析', '基本面',
  '宏观', '周期', '复盘', '解读', '洞察',
];

// Category detection (English + Chinese keywords)
export const CATEGORY_MAP: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'satoshi', 'halving', 'microstrategy', 'saylor', 'miner', 'mining', 'hashrate', '比特币', '减半', '矿工', '算力'],
  'ETH': ['ethereum', 'eth', 'vitalik', 'erc', 'pectra', 'beacon', 'staking', 'blob', '以太坊', '质押'],
  'DeFi': ['defi', 'dex', 'lending', 'yield', 'tvl', 'uniswap', 'aave', 'compound', 'curve', 'makerdao', 'lido', 'pendle', 'eigenlayer', 'restaking', '去中心化金融'],
  'NFT': ['nft', 'opensea', 'collection', 'mint', 'blur', 'pudgy', 'bayc', 'azuki', 'ordinals', 'inscription', '铭文'],
  'L2': ['layer 2', 'layer2', 'rollup', 'arbitrum', 'optimism', 'base', 'zk', 'polygon', 'starknet', 'scroll', 'linea', 'zksync', 'mantle', 'blast'],
  'Policy': ['sec', 'regulation', 'law', 'compliance', 'congress', 'mica', 'license', 'cftc', 'enforcement', 'sanctions', 'taxation', 'cbdc', '监管', '法规', '合规', '央行数字货币', '税收'],
  'SOL': ['solana', 'sol', 'jupiter', 'jito', 'raydium', 'marinade', 'tensor', 'drift', 'pyth', 'bonk'],
  'Stable': ['stablecoin', 'usdt', 'usdc', 'tether', 'circle', 'dai', 'paypal', 'ondo', 'ethena', 'frax', '稳定币'],
  'AI': ['artificial intelligence', 'ai agent', 'gpu', 'compute', 'render', 'worldcoin', 'fetch.ai', 'bittensor', 'near ai', 'virtuals', 'ai16z', 'sentient'],
  'Exchange': ['binance', 'coinbase', 'kraken', 'okx', 'bybit', 'upbit', 'bitget', 'htx', 'gate.io', 'kucoin', '交易所', '上线', 'listing', 'delist'],
  'Meme': ['meme', 'doge', 'shiba', 'pepe', 'bonk', 'wif', 'floki', 'trump', 'brett', 'mog', 'popcat'],
  'RWA': ['rwa', 'real world', 'tokenization', 'treasur', 'blackrock', 'securitize', 'maple', '实物资产', '代币化'],
  'Gaming': ['gaming', 'gamefi', 'metaverse', 'immutable', 'gala', 'axie', 'illuvium', 'ronin', '游戏', '链游', '元宇宙'],
  'Analysis': ['analysis', 'report', 'research', 'outlook', 'forecast', 'deep dive', 'breakdown', 'thesis', 'macro review', '分析', '研报', '深度', '展望', '报告', '解读', '洞察'],
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

  // ── SEO Optimization Prompt ──
  seoOptimizePrompt: `You are an SEO specialist for HashSpring, a crypto news platform.
Given a news headline, generate an SEO-optimized version.

Rules:
- Keep it under 70 characters (for Google SERP display)
- Include the primary keyword naturally
- Use active voice and power words
- Don't clickbait — stay factual
- Keep crypto tickers ($BTC, $ETH) if present
- For Chinese: keep under 35 characters

Output format (JSON only, no markdown):
{"title": "optimized title", "slug": "url-friendly-slug", "keywords": ["kw1", "kw2", "kw3"], "description": "120-char meta description"}`,

  // ── Translation Prompt ──
  translationPrompt: `You are a professional crypto news translator for HashSpring.
Rules:
- Translate to Traditional Chinese (繁體中文), NOT Simplified Chinese (简体)
- Keep crypto terms in English: DeFi, ETF, BTC, ETH, NFT, L2, TVL, DEX, etc.
- Keep brand names exactly as-is: LBank, Binance, Coinbase, Uniswap, OKX, Bybit, Bitget, etc.
- Keep ticker symbols: $BTC, $ETH, $SOL
- Preserve numbers, dates, percentages
- Use professional news tone
- Output ONLY the translation, no explanations`,

  // ── Content Summary Prompt ──
  summaryPrompt: `You are a crypto news editor for HashSpring.
Given a news headline and optional description, write a 2-3 sentence summary that:
- Explains the key facts and why it matters
- Uses professional news tone
- Includes relevant context (market impact, background)
- Is original — do not copy the source text verbatim

Output format (JSON only, no markdown):
{"summary_en": "English summary", "summary_zh": "繁體中文 summary", "tags": ["tag1", "tag2"]}`,
};

// ============================================================
// SEO SLUG GENERATION
// ============================================================
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\$([a-z]+)/g, '$1') // $BTC → btc
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-')         // spaces → hyphens
    .replace(/-+/g, '-')          // dedupe hyphens
    .replace(/^-|-$/g, '')        // trim hyphens
    .slice(0, 80);                // max length
}

// Generate a stable content hash for use as ID
export function contentHash(title: string, source: string): string {
  let hash = 0;
  const str = `${title}::${source}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const slug = generateSlug(title);
  // Format: slug-prefix + hash for uniqueness
  return slug ? `${slug.slice(0, 50)}-${hex}` : `flash-${hex}`;
}
