/**
 * Trending Tokens API
 * Fetches real-time data from OKX public spot tickers,
 * computes a heat score based on volume + price momentum,
 * and returns the top 50 tokens.
 *
 * GET /api/trending          → all tokens
 * GET /api/trending?cat=meme → filtered by category
 *
 * Cache: 60s server-side
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Token metadata ──────────────────────────────────────────────────────────

const TOKEN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'XRP',
  ADA: 'Cardano', AVAX: 'Avalanche', DOT: 'Polkadot', TRX: 'TRON',
  NEAR: 'NEAR', ICP: 'Internet Computer', APT: 'Aptos', SUI: 'Sui',
  ATOM: 'Cosmos', FTM: 'Fantom', SEI: 'Sei', TAO: 'Bittensor',
  TON: 'Toncoin', HBAR: 'Hedera', XLM: 'Stellar', LTC: 'Litecoin',
  BCH: 'Bitcoin Cash', ETC: 'Ethereum Classic', ALGO: 'Algorand',
  ARB: 'Arbitrum', OP: 'Optimism', MATIC: 'Polygon', IMX: 'Immutable',
  ZK: 'zkSync', STRK: 'Starknet', MANTA: 'Manta Network',
  UNI: 'Uniswap', LINK: 'Chainlink', AAVE: 'Aave', MKR: 'Maker',
  CRV: 'Curve', JUP: 'Jupiter', INJ: 'Injective', TIA: 'Celestia',
  DYDX: 'dYdX', PENDLE: 'Pendle', LDO: 'Lido DAO', GMX: 'GMX',
  EIGEN: 'Eigenlayer', ENS: 'ENS', SNX: 'Synthetix',
  RENDER: 'Render', FET: 'Fetch.ai', WLD: 'Worldcoin',
  RNDR: 'Render Network', GRT: 'The Graph', OCEAN: 'Ocean Protocol',
  PEPE: 'Pepe', SHIB: 'Shiba Inu', DOGE: 'Dogecoin', BONK: 'Bonk',
  WIF: 'dogwifhat', FLOKI: 'Floki', NEIRO: 'Neiro',
  OKB: 'OKB', GT: 'Gate Token', KCS: 'KuCoin Token',
};

type Category = 'layer1' | 'layer2' | 'defi' | 'meme' | 'ai' | 'exchange' | 'other';

const TOKEN_CATEGORIES: Record<string, Category> = {
  BTC: 'layer1', ETH: 'layer1', SOL: 'layer1', BNB: 'layer1', XRP: 'layer1',
  ADA: 'layer1', AVAX: 'layer1', DOT: 'layer1', TRX: 'layer1', NEAR: 'layer1',
  ICP: 'layer1', APT: 'layer1', SUI: 'layer1', ATOM: 'layer1', FTM: 'layer1',
  SEI: 'layer1', TAO: 'layer1', TON: 'layer1', HBAR: 'layer1', XLM: 'layer1',
  LTC: 'layer1', BCH: 'layer1', ETC: 'layer1', ALGO: 'layer1',
  ARB: 'layer2', OP: 'layer2', MATIC: 'layer2', IMX: 'layer2',
  ZK: 'layer2', STRK: 'layer2', MANTA: 'layer2',
  UNI: 'defi', LINK: 'defi', AAVE: 'defi', MKR: 'defi', CRV: 'defi',
  SNX: 'defi', JUP: 'defi', INJ: 'defi', TIA: 'defi', DYDX: 'defi',
  PENDLE: 'defi', EIGEN: 'defi', ENS: 'defi', LDO: 'defi', GMX: 'defi',
  RENDER: 'ai', FET: 'ai', WLD: 'ai', RNDR: 'ai', GRT: 'ai', OCEAN: 'ai',
  PEPE: 'meme', SHIB: 'meme', DOGE: 'meme', BONK: 'meme',
  WIF: 'meme', FLOKI: 'meme', NEIRO: 'meme',
  OKB: 'exchange', GT: 'exchange', KCS: 'exchange',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrendingToken {
  rank: number;
  symbol: string;
  name: string;
  category: Category;
  price: number;
  change24h: number;   // decimal: 0.045 = +4.5%
  high24h: number;
  low24h: number;
  volume24h: number;   // USD value
  heatScore: number;   // 0-100
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let cache: { data: TrendingToken[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 60_000; // 60 seconds

// ─── Fetch + compute ─────────────────────────────────────────────────────────

async function fetchTrending(): Promise<TrendingToken[]> {
  const res = await fetch(
    'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) throw new Error(`OKX API ${res.status}`);

  const json = await res.json();
  if (json.code !== '0' || !Array.isArray(json.data)) throw new Error('OKX bad response');

  // Filter: USDT spot pairs with meaningful volume (> $1M / 24h)
  const pairs = json.data
    .filter((t: Record<string, string>) =>
      t.instId.endsWith('-USDT') && parseFloat(t.volCcy24h) > 1_000_000
    )
    .map((t: Record<string, string>) => {
      const symbol = t.instId.replace('-USDT', '');
      const price = parseFloat(t.last);
      const open24h = parseFloat(t.open24h);
      const change24h = open24h > 0 ? (price - open24h) / open24h : 0;
      return {
        symbol,
        price,
        change24h,
        high24h: parseFloat(t.high24h),
        low24h: parseFloat(t.low24h),
        volume24h: parseFloat(t.volCcy24h),
      };
    });

  // Sort by 24h volume descending and take top 100
  const byVolume = [...pairs].sort((a, b) => b.volume24h - a.volume24h).slice(0, 100);

  // Compute heat score (0–100):
  //  • Volume rank contribution (0–55): linear from position 1–100
  //  • Price change contribution (0–45): scaled by |change| magnitude
  const withScore = byVolume.map((t, idx) => {
    const volScore = ((100 - idx) / 100) * 55;
    const changePct = Math.abs(t.change24h) * 100; // e.g. 4.5
    const changeScore = Math.min(changePct * 3, 45); // cap at 45
    const heatScore = Math.min(Math.round(volScore + changeScore), 100);
    return {
      ...t,
      name: TOKEN_NAMES[t.symbol] || t.symbol,
      category: (TOKEN_CATEGORIES[t.symbol] || 'other') as Category,
      heatScore,
    };
  });

  // Re-sort by heatScore, assign ranks
  return withScore
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, 50)
    .map((t, idx) => ({ ...t, rank: idx + 1 }));
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cat = request.nextUrl.searchParams.get('cat');
  const now = Date.now();

  // Refresh cache if stale
  if (!cache.data.length || now - cache.ts > CACHE_TTL) {
    try {
      cache = { data: await fetchTrending(), ts: now };
    } catch (err) {
      console.error('[/api/trending] fetch error:', err);
      if (!cache.data.length) {
        return NextResponse.json([], { status: 503 });
      }
      // Fall through to stale cache
    }
  }

  const result = cat
    ? cache.data.filter(t => t.category === cat)
    : cache.data;

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
