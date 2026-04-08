import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Cache ─────────────────────────────────────────────
let cache: { data: FearGreedData | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FearGreedData {
  current: { value: number; label: string; timestamp: number };
  history: { value: number; label: string; date: string }[];
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Fetch 30-day history from Alternative.me
    const res = await fetch(
      'https://api.alternative.me/fng/?limit=30&format=json',
      { next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error(`FNG API error: ${res.status}`);

    const json = await res.json();
    const entries: FearGreedEntry[] = json.data || [];

    if (!entries.length) throw new Error('No FNG data');

    const current = {
      value: parseInt(entries[0].value, 10),
      label: entries[0].value_classification,
      timestamp: parseInt(entries[0].timestamp, 10) * 1000,
    };

    const history = entries.slice(0, 30).map((e) => ({
      value: parseInt(e.value, 10),
      label: e.value_classification,
      date: new Date(parseInt(e.timestamp, 10) * 1000)
        .toISOString()
        .slice(0, 10),
    }));

    const data: FearGreedData = { current, history };

    cache = { data, ts: now };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[fear-greed] Error:', err);
    // Return cached data if available
    if (cache.data) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch Fear & Greed data' },
      { status: 502 }
    );
  }
}
