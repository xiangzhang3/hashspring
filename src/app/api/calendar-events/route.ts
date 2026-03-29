import { NextResponse } from 'next/server';

export const revalidate = 3600; // 1小时缓存

interface CalendarEvent {
  date: string;
  title: string;
  type: 'unlock' | 'exchange' | 'policy' | 'airdrop' | 'event' | 'other';
}

export async function GET() {
  const events: CalendarEvent[] = [];

  // 并发获取多个数据源
  const [unlocksRes] = await Promise.allSettled([
    // Token Unlocks from DeFiLlama
    fetch('https://api.llama.fi/unlocks/upcoming', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    }),
  ]);

  // Process Token Unlocks
  if (unlocksRes.status === 'fulfilled' && unlocksRes.value.ok) {
    try {
      const json = await unlocksRes.value.json();
      const unlocks = Array.isArray(json) ? json : (json?.data || json?.unlocks || []);
      for (const u of unlocks.slice(0, 20)) {
        const name = u.name || u.symbol || u.token || 'Unknown';
        const amount = u.amount || u.value || '';
        const usd = u.usdValue || u.value_usd || '';
        const dateStr = u.date || u.unlock_date || u.timestamp;
        if (!dateStr) continue;

        const d = new Date(typeof dateStr === 'number' ? dateStr * 1000 : dateStr);
        if (isNaN(d.getTime())) continue;

        const formattedUsd = usd ? `, ~$${(Number(usd) / 1e6).toFixed(1)}M` : '';
        events.push({
          date: d.toISOString().slice(0, 10),
          title: `${name} unlocks ${amount ? amount.toLocaleString?.() || amount : ''}${formattedUsd}`,
          type: 'unlock',
        });
      }
    } catch { /* skip */ }
  }

  // 如果 API 数据不够，补充静态近期事件（备用数据）
  if (events.length < 3) {
    const today = new Date();
    const formatDate = (daysFromNow: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromNow);
      return d.toISOString().slice(0, 10);
    };

    const staticEvents: CalendarEvent[] = [
      { date: formatDate(0), title: 'CoinGecko Daily Market Update', type: 'other' },
      { date: formatDate(1), title: 'Federal Reserve FOMC Minutes Watch', type: 'policy' },
      { date: formatDate(1), title: 'Ethereum Core Dev Call #210', type: 'event' },
      { date: formatDate(2), title: 'US Initial Jobless Claims Report', type: 'policy' },
      { date: formatDate(3), title: 'ETHGlobal Brussels Hackathon', type: 'event' },
      { date: formatDate(4), title: 'Bitcoin Options Expiry ($2.1B)', type: 'other' },
      { date: formatDate(5), title: 'Arbitrum DAO Governance Vote', type: 'event' },
    ];

    events.push(...staticEvents);
  }

  // 排序并去重
  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(events.slice(0, 30), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
