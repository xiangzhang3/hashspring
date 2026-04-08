import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Cache ─────────────────────────────────────────────
let cache: { data: DefiTVLData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface ChainTVL {
  name: string;
  tvl: number;
  change_1d: number;
}

interface DefiTVLData {
  totalTvl: number;
  change24h: number;
  topChains: ChainTVL[];
  updatedAt: number;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      });
    }

    // Fetch chain TVL data from DeFi Llama (free, no key)
    const [chainsRes, protocolsRes] = await Promise.all([
      fetch('https://api.llama.fi/v2/chains', { next: { revalidate: 600 } }),
      fetch('https://api.llama.fi/protocols', { next: { revalidate: 600 } }),
    ]);

    if (!chainsRes.ok) throw new Error(`DeFi Llama chains error: ${chainsRes.status}`);

    const chains = await chainsRes.json();

    // Calculate total TVL and sort chains
    interface LlamaChain {
      name: string;
      tvl: number;
      chainId?: number;
    }

    const sortedChains = (chains as LlamaChain[])
      .filter((c) => c.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl);

    const totalTvl = sortedChains.reduce((sum, c) => sum + c.tvl, 0);

    // Get top 10 chains with their data
    const topChains: ChainTVL[] = sortedChains.slice(0, 10).map((c) => ({
      name: c.name,
      tvl: c.tvl,
      change_1d: 0, // DeFi Llama chains endpoint doesn't include change
    }));

    // Try to get 24h change from historical data
    let change24h = 0;
    try {
      const histRes = await fetch('https://api.llama.fi/v2/historicalChainTvl', {
        next: { revalidate: 600 },
      });
      if (histRes.ok) {
        const hist = await histRes.json();
        if (Array.isArray(hist) && hist.length >= 2) {
          const latest = hist[hist.length - 1]?.tvl || 0;
          const prev = hist[hist.length - 2]?.tvl || 0;
          if (prev > 0) {
            change24h = ((latest - prev) / prev) * 100;
          }
        }
      }
    } catch {
      // ignore, change24h stays 0
    }

    // Get protocol count
    let protocolCount = 0;
    if (protocolsRes.ok) {
      const protocols = await protocolsRes.json();
      protocolCount = Array.isArray(protocols) ? protocols.length : 0;
    }

    const data: DefiTVLData & { protocolCount: number } = {
      totalTvl,
      change24h,
      topChains,
      protocolCount,
      updatedAt: now,
    };

    cache = { data, ts: now };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (err) {
    console.error('[defi-tvl] Error:', err);
    if (cache.data) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch DeFi TVL data' },
      { status: 502 }
    );
  }
}
