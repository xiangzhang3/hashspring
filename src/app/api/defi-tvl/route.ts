import { NextResponse } from 'next/server';
let cache: { data: any; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 10 * 60 * 1000;
export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
    }
    const [chainsRes, protocolsRes] = await Promise.all([
      fetch('https://api.llama.fi/v2/chains', { next: { revalidate: 600 } }),
      fetch('https://api.llama.fi/protocols', { next: { revalidate: 600 } }),
    ]);
    if (!chainsRes.ok) throw new Error('DeFi Llama error: ' + chainsRes.status);
    const chains = await chainsRes.json();
    const sortedChains = chains.filter((c: any) => c.tvl > 0).sort((a: any, b: any) => b.tvl - a.tvl);
    const totalTvl = sortedChains.reduce((sum: number, c: any) => sum + c.tvl, 0);
    const topChains = sortedChains.slice(0, 10).map((c: any) => ({ name: c.name, tvl: c.tvl, change_1d: 0 }));
    let change24h = 0;
    try {
      const histRes = await fetch('https://api.llama.fi/v2/historicalChainTvl', { next: { revalidate: 600 } });
      if (histRes.ok) {
        const hist = await histRes.json();
        if (Array.isArray(hist) && hist.length >= 2) {
          const latest = hist[hist.length - 1]?.tvl || 0;
          const prev = hist[hist.length - 2]?.tvl || 0;
          if (prev > 0) change24h = ((latest - prev) / prev) * 100;
        }
      }
    } catch {}
    let protocolCount = 0;
    if (protocolsRes.ok) { const p = await protocolsRes.json(); protocolCount = Array.isArray(p) ? p.length : 0; }
    const data = { totalTvl, change24h, topChains, protocolCount, updatedAt: now };
    cache = { data, ts: now };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } });
  } catch (err) {
    console.error('[defi-tvl] Error:', err);
    if (cache.data) return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
    return NextResponse.json({ error: 'Failed to fetch DeFi TVL data' }, { status: 502 });
  }
}
