'use client';

import { useEffect, useState } from 'react';

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  marketCapRank: number | null;
  priceUsd: number;
  change24h: number;
  score: number;
}

interface TrendingData {
  coins: TrendingCoin[];
  updatedAt: number;
}

function formatPrice(price: number): string {
  if (price === 0) return '-';
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export default function CoinGeckoTrending({ locale = 'en' }: { locale?: string }) {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const isEn = locale === 'en';

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/coingecko-trending');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-36 bg-[var(--border-color)] rounded" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--border-color)]" />
              <div className="h-3 flex-1 bg-[var(--border-color)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.coins.length) return null;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          🔍 {isEn ? 'Trending Searches' : '热搜币种'}
        </h3>
        <span className="text-[10px] text-[var(--text-secondary)]">
          CoinGecko
        </span>
      </div>

      {/* Coins list */}
      <div className="space-y-1.5">
        {data.coins.slice(0, 10).map((coin, i) => (
          <div
            key={coin.id}
            className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-[var(--bg-primary)] transition-colors"
          >
            {/* Rank */}
            <span className="text-[10px] text-[var(--text-secondary)] w-3 text-right tabular-nums font-medium">
              {i + 1}
            </span>

            {/* Coin image */}
            <img
              src={coin.thumb}
              alt={coin.symbol}
              width={20}
              height={20}
              className="rounded-full"
              loading="lazy"
            />

            {/* Name + Symbol */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {coin.name}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {coin.symbol}
                </span>
              </div>
            </div>

            {/* Price + Change */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-[var(--text-primary)] tabular-nums">
                {formatPrice(coin.priceUsd)}
              </p>
              {coin.change24h !== 0 && (
                <p className={`text-[10px] tabular-nums font-medium ${
                  coin.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
        <p className="text-[10px] text-[var(--text-secondary)] text-center">
          {isEn ? 'Based on CoinGecko search trends' : '基于 CoinGecko 搜索趋势'}
        </p>
      </div>
    </div>
  );
}
