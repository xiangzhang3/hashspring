'use client';

import { useEffect, useState } from 'react';

interface OverviewData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  activeCoins: number;
  marketCapChange: number;
  volumeChange: number;
  btcDomChange: number;
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function MarketOverview({ locale }: { locale: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const isEn = locale === 'en';
  const isFil = locale === 'fil';

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch('/api/prices?type=markets', { cache: 'no-store' });
        if (!res.ok) return;
        const coins = await res.json();
        if (!Array.isArray(coins) || coins.length === 0) return;

        // Compute overview from top 50 coins
        const totalMarketCap = coins.reduce((sum: number, c: { market_cap?: number }) => sum + (c.market_cap || 0), 0);
        const totalVolume = coins.reduce((sum: number, c: { total_volume?: number }) => sum + (c.total_volume || 0), 0);

        // BTC dominance = BTC market cap / total market cap of top 50
        const btc = coins.find((c: { id?: string }) => c.id === 'bitcoin');
        const btcDominance = btc && totalMarketCap > 0
          ? ((btc.market_cap || 0) / totalMarketCap) * 100
          : 0;

        // Weighted average 24h change for market cap
        const marketCapChange = totalMarketCap > 0
          ? coins.reduce((sum: number, c: { market_cap?: number; price_change_percentage_24h?: number }) =>
            sum + ((c.market_cap || 0) / totalMarketCap) * (c.price_change_percentage_24h || 0), 0)
          : 0;

        setData({
          totalMarketCap,
          totalVolume,
          btcDominance,
          activeCoins: coins.length,
          marketCapChange,
          volumeChange: 0, // CoinGecko markets endpoint doesn't provide volume change
          btcDomChange: 0,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
    const timer = setInterval(fetchOverview, 120_000);
    return () => clearInterval(timer);
  }, []);

  const cards = data
    ? [
        {
          label: isEn ? 'Total Market Cap' : isFil ? 'Total Market Cap' : '總市值',
          value: fmt(data.totalMarketCap),
          change: data.marketCapChange !== 0 ? `${data.marketCapChange >= 0 ? '+' : ''}${data.marketCapChange.toFixed(1)}%` : '',
          positive: data.marketCapChange >= 0,
        },
        {
          label: isEn ? '24h Volume' : isFil ? '24h Volume' : '24h 成交量',
          value: fmt(data.totalVolume),
          change: '',
          positive: true,
        },
        {
          label: isEn ? 'BTC Dominance' : isFil ? 'BTC Dominance' : 'BTC 佔比',
          value: `${data.btcDominance.toFixed(1)}%`,
          change: '',
          positive: true,
        },
        {
          label: isEn ? 'Top Coins' : isFil ? 'Top Coins' : '追蹤幣種',
          value: `${data.activeCoins}`,
          change: '',
          positive: true,
        },
      ]
    : null;

  if (loading || !cards) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)] animate-pulse">
            <div className="w-20 h-3 bg-[var(--border-color)] rounded mb-2" />
            <div className="w-24 h-5 bg-[var(--border-color)] rounded mb-1" />
            <div className="w-12 h-3 bg-[var(--border-color)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{card.label}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{card.value}</p>
          {card.change && (
            <p className={`text-xs font-medium tabular-nums ${card.positive ? 'text-green-500' : 'text-red-500'}`}>
              {card.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
