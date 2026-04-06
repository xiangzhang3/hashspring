import { NextResponse } from 'next/server';
let cache: { data: any; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 3 * 60 * 1000;
export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360' } });
    }
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', { next: { revalidate: 180 }, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('CoinGecko error: ' + res.status);
    const json = await res.json();
    const coins = (json.coins || []).slice(0, 15).map((c: any) => ({
      id: c.item.id, name: c.item.name, symbol: c.item.symbol.toUpperCase(), thumb: c.item.thumb,
      marketCapRank: c.item.market_cap_rank, priceUsd: c.item.data?.price || 0,
      change24h: c.item.data?.price_change_percentage_24h?.usd || 0, score: c.item.score,
    }));
    const data = { coins, updatedAt: now };
    cache = { data, ts: now };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360' } });
  } catch (err) {
    console.error('[coingecko-trending] Error:', err);
    if (cache.data) return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
    return NextResponse.json({ error: 'Failed to fetch trending data' }, { status: 502 });
  }
}
