/**
 * Crypto Prices API (Server-Side Proxy)
 *
 * Proxies CoinGecko price data with server-side caching to avoid
 * client-side rate limiting. All client components should fetch
 * from this endpoint instead of calling CoinGecko directly.
 *
 * GET /api/prices?type=simple    → top coins (Ticker + MarketWidget)
 * GET /api/prices?type=markets   → full market data (MarketTable)
 *
 * Cache: 30 seconds server-side, 15 seconds client-side
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache to reduce CoinGecko calls across all users
let simpleCache: { data: Record<string, unknown> | null; ts: number } = { data: null, ts: 0 };
let marketsCache: { data: unknown[] | null; ts: number } = { data: null, ts: 0 };
let trendingCache: { data: unknown | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 30_000; // 30 seconds
const TRENDING_TTL = 300_000; // 5 minutes

// Include all coins needed by Ticker, MarketWidget, and MarketHeatmap
const SIMPLE_IDS = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,avalanche-2,polkadot,chainlink,tron,matic-network,litecoin,uniswap,near,internet-computer,aptos,sui,arbitrum,optimism';

// Max age for stale cache before we refuse to return it (5 minutes)
const STALE_MAX_AGE = 5 * 60 * 1000;

async function fetchSimplePrices(): Promise<{ data: Record<string, unknown> | null; fresh: boolean }> {
  const now = Date.now();
  if (simpleCache.data && now - simpleCache.ts < CACHE_TTL) {
    return { data: simpleCache.data, fresh: true };
  }

  // Try CoinGecko with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${SIMPLE_IDS}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HashSpring/1.0',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      // Rate limited — wait briefly and retry
      if (res.status === 429 && attempt === 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) {
        console.warn(`CoinGecko simple API error: ${res.status} (attempt ${attempt + 1})`);
        break;
      }

      const data = await res.json();
      // Validate response has actual price data
      if (data?.bitcoin?.usd) {
        simpleCache = { data, ts: now };
        return { data, fresh: true };
      }
      break;
    } catch (error) {
      console.warn(`CoinGecko simple fetch error (attempt ${attempt + 1}):`, error);
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Return stale cache only if not too old
  if (simpleCache.data && now - simpleCache.ts < STALE_MAX_AGE) {
    return { data: simpleCache.data, fresh: false };
  }
  return { data: null, fresh: false };
}

async function fetchMarketData(): Promise<unknown[] | null> {
  const now = Date.now();
  if (marketsCache.data && now - marketsCache.ts < CACHE_TTL) {
    return marketsCache.data;
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d',
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.warn('CoinGecko markets API error:', res.status);
      return marketsCache.data;
    }

    const data = await res.json();
    marketsCache = { data, ts: now };
    return data;
  } catch (error) {
    console.warn('CoinGecko markets fetch error:', error);
    return marketsCache.data;
  }
}

async function fetchTrending(): Promise<unknown | null> {
  const now = Date.now();
  if (trendingCache.data && now - trendingCache.ts < TRENDING_TTL) {
    return trendingCache.data;
  }
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return trendingCache.data;
    const data = await res.json();
    trendingCache = { data, ts: now };
    return data;
  } catch {
    return trendingCache.data;
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'simple';

  try {
    if (type === 'trending') {
      const data = await fetchTrending();
      if (!data) {
        return NextResponse.json({ coins: [] }, {
          headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
      }
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    if (type === 'markets') {
      const data = await fetchMarketData();
      if (!data) {
        return NextResponse.json(
          { error: 'Price data temporarily unavailable' },
          {
            status: 503,
            headers: {
              'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
            },
          }
        );
      }
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    // Default: simple prices
    const { data, fresh } = await fetchSimplePrices();
    if (!data) {
      return NextResponse.json(
        { error: 'Price data temporarily unavailable' },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': fresh ? 'public, s-maxage=15, stale-while-revalidate=30' : 'no-cache',
        'X-Price-Fresh': fresh ? 'true' : 'stale',
      },
    });
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
