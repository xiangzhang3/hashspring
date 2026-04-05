'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TrendingToken } from '@/app/api/trending/route';

// ─── Category filter tabs ────────────────────────────────────────────────────
type CategoryFilter = 'all' | 'layer1' | 'layer2' | 'defi' | 'meme' | 'ai' | 'exchange';

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'layer1',   label: 'Layer 1' },
  { id: 'layer2',   label: 'Layer 2' },
  { id: 'defi',     label: 'DeFi' },
  { id: 'meme',     label: 'Meme' },
  { id: 'ai',       label: 'AI' },
  { id: 'exchange', label: 'Exchange' },
];

// ─── Token avatar (colored gradient circle) ──────────────────────────────────
function TokenAvatar({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    BTC: 'from-orange-400 to-orange-600', ETH: 'from-blue-400 to-purple-600',
    SOL: 'from-purple-400 to-green-400',  BNB: 'from-yellow-300 to-yellow-500',
    XRP: 'from-blue-300 to-blue-600',     ADA: 'from-blue-400 to-blue-700',
    DOGE: 'from-yellow-300 to-yellow-600',PEPE: 'from-green-400 to-green-600',
    SHIB: 'from-orange-300 to-red-500',
  };
  const gradient = colors[symbol] || 'from-gray-400 to-gray-600';
  const abbr = symbol.slice(0, 3);
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-[9px] font-bold">{abbr}</span>
    </div>
  );
}

// ─── Heat bar ────────────────────────────────────────────────────────────────
function HeatBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-400' : score >= 40 ? 'bg-yellow-400' : 'bg-blue-400';
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{score}</span>
    </div>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1)    return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toExponential(2);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return '$' + (vol / 1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return '$' + (vol / 1e6).toFixed(1) + 'M';
  return '$' + (vol / 1e3).toFixed(0) + 'K';
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <div className="w-6 h-3 bg-gray-700 rounded" />
          <div className="w-8 h-8 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-700 rounded w-24" />
            <div className="h-2 bg-gray-700 rounded w-12" />
          </div>
          <div className="h-3 bg-gray-700 rounded w-20" />
          <div className="h-3 bg-gray-700 rounded w-14" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface TrendingTableProps {
  locale?: string;
}

export function TrendingTable({ locale = 'en' }: TrendingTableProps) {
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async (cat: CategoryFilter) => {
    try {
      const url = cat === 'all' ? '/api/trending' : `/api/trending?cat=${cat}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const data: TrendingToken[] = await res.json();
      setTokens(data);
    } catch (err) {
      console.error('[TrendingTable] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + category change
  useEffect(() => {
    setLoading(true);
    fetchData(category);
  }, [category, fetchData]);

  // Auto-refresh every 60s with countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData(category);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [category, fetchData]);

  const zh = locale === 'zh';

  return (
    <div className="bg-[#12121f] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-base font-bold text-white">
          {zh ? '🔥 热门 Token 排行' : '🔥 Hot Tokens'}
        </h2>
        <span className="text-xs text-gray-500">
          {zh ? `${countdown}s 后刷新` : `Refresh in ${countdown}s`}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id); setCountdown(60); }}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === c.id
                ? 'bg-[#0066FF] text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_100px_72px_72px_80px] gap-2 px-4 py-2 text-xs text-gray-500 border-b border-white/10 hidden sm:grid">
        <span>#</span>
        <span>{zh ? '代币' : 'Token'}</span>
        <span className="text-right">{zh ? '价格' : 'Price'}</span>
        <span className="text-right">24h%</span>
        <span className="text-right hidden md:block">{zh ? '成交量' : 'Volume'}</span>
        <span className="text-center hidden lg:block">{zh ? '热度' : 'Heat'}</span>
      </div>

      {/* Rows */}
      {loading ? <Skeleton /> : (
        <div className="divide-y divide-white/5">
          {tokens.map(token => {
            const isUp = token.change24h >= 0;
            const changePct = (token.change24h * 100).toFixed(2);
            return (
              <div
                key={token.symbol}
                className="grid grid-cols-[32px_1fr_100px_72px] sm:grid-cols-[32px_1fr_100px_72px_72px_80px] gap-2 items-center px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                {/* Rank */}
                <span className="text-xs text-gray-500 text-center">{token.rank}</span>

                {/* Token info */}
                <div className="flex items-center gap-2 min-w-0">
                  <TokenAvatar symbol={token.symbol} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{token.symbol}</div>
                    <div className="text-xs text-gray-500 truncate">{token.name}</div>
                  </div>
                </div>

                {/* Price */}
                <span className="text-sm text-white text-right font-mono">{formatPrice(token.price)}</span>

                {/* 24h change */}
                <span className={`text-xs font-medium text-right ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{changePct}%
                </span>

                {/* Volume (hidden on mobile) */}
                <span className="text-xs text-gray-400 text-right hidden md:block">{formatVolume(token.volume24h)}</span>

                {/* Heat bar (hidden on small screens) */}
                <div className="hidden lg:flex justify-center">
                  <HeatBar score={token.heatScore} />
                </div>
              </div>
            );
          })}
          {tokens.length === 0 && !loading && (
            <div className="py-12 text-center text-gray-500 text-sm">
              {zh ? '暂无数据' : 'No data available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
