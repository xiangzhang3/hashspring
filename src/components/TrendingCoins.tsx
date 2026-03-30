'use client';

import { useState, useEffect } from 'react';

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
  score: number;
}

const FALLBACK_TRENDING: TrendingCoin[] = [
  { id: 'pepe', name: 'Pepe', symbol: 'PEPE', market_cap_rank: 25, thumb: '', price_btc: 0.0000000012, score: 0 },
  { id: 'render-token', name: 'Render', symbol: 'RNDR', market_cap_rank: 30, thumb: '', price_btc: 0.000078, score: 1 },
  { id: 'injective-protocol', name: 'Injective', symbol: 'INJ', market_cap_rank: 42, thumb: '', price_btc: 0.00032, score: 2 },
  { id: 'celestia', name: 'Celestia', symbol: 'TIA', market_cap_rank: 55, thumb: '', price_btc: 0.00012, score: 3 },
  { id: 'sei-network', name: 'Sei', symbol: 'SEI', market_cap_rank: 60, thumb: '', price_btc: 0.0000058, score: 4 },
  { id: 'jupiter', name: 'Jupiter', symbol: 'JUP', market_cap_rank: 65, thumb: '', price_btc: 0.0000092, score: 5 },
];

export default function TrendingCoins({ locale }: { locale: string }) {
  const [trending, setTrending] = useState<TrendingCoin[]>(FALLBACK_TRENDING);
  const isEn = locale === 'en';

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/api/prices?type=trending');
        if (res.ok) {
          const data = await res.json();
          if (data.coins?.length) {
            setTrending(
              data.coins.slice(0, 8).map((c: any, i: number) => ({
                id: c.item.id,
                name: c.item.name,
                symbol: c.item.symbol,
                market_cap_rank: c.item.market_cap_rank || 0,
                thumb: c.item.thumb || '',
                price_btc: c.item.price_btc || 0,
                score: i,
              }))
            );
          }
        }
      } catch {
        // keep fallback
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
        🔥 {isEn ? 'Trending Coins' : '熱門幣種'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {trending.map((coin, idx) => (
          <div
            key={coin.id}
            className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-blue-500/30 transition-colors"
          >
            <span className="text-xs font-bold text-[var(--text-secondary)] w-5">{idx + 1}</span>
            {coin.thumb && <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{coin.name}</p>
              <p className="text-xs text-[var(--text-secondary)] uppercase">{coin.symbol}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
