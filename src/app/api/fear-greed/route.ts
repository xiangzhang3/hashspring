import { NextResponse } from 'next/server';
let cache: { data: any; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;
export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
    }
    const res = await fetch('https://api.alternative.me/fng/?limit=30&format=json', { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('FNG API error: ' + String(res.status));
    const json = await res.json();
    const entries = json.data || [];
    if (!entries.length) throw new Error('No FNG data');
    const current = { value: parseInt(entries[0].value, 10), label: entries[0].value_classification, timestamp: parseInt(entries[0].timestamp, 10) * 1000 };
    const history = entries.slice(0, 30).map((e: any) => ({ value: parseInt(e.value, 10), label: e.value_classification, date: new Date(parseInt(e.timestamp, 10) * 1000).toISOString().slice(0, 10) }));
    const data = { current, history };
    cache = { data, ts: now };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (err) {
    console.error('[fear-greed] Error:', err);
    if (cache.data) return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
    return NextResponse.json({ error: 'Failed to fetch Fear & Greed data' }, { status: 502 });
  }
}
