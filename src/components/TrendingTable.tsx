'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrendingToken {
  rank: number;
  symbol: string;
  name: string;
  category: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  heatScore: number;
}

type CategoryFilter = 'all' | 'layer1' | 'layer2' | 'defi' | 'meme' | 'ai' | 'exchange';

const CATEGORY_LABELS: Record<CategoryFilter, { en: string; zh: string }> = {
  all:      { en: 'All',       zh: '全部'   },
  layer1:   { en: 'Layer 1',   zh: 'L1'    },
  layer2:   { en: 'Layer 2',   zh: 'L2'    },
  defi:     { en: 'DeFi',      zh: 'DeFi'  },
  meme:     { en: 'Meme',      zh: 'Meme'  },
  ai:       { en: 'AI',        zh: 'AI'    },
  exchange: { en: 'Exchange',  zh: '交易所' },
};

// Symbol → gradient colour for avatar
const SYMBOL_COLORS: Record<string, string> = {
  BTC: 'from-orange-400 to-orange-600',   ETH: 'from-blue-400 to-purple-600',
  SOL: 'from-purple-400 to-cyan-400',     BNB: 'from-yellow-400 to-yellow-600',
  XRP: 'from-blue-400 to-blue-600',       ADA: 'from-blue-300 to-blue-500',
  AVAX: 'from-red-400 to-red-600',        DOT: 'from-pink-400 to-pink-600',
  DOGE: 'from-yellow-300 to-yellow-500',  SHIB: 'from-orange-300 to-red-400',
  PEPE: 'from-green-400 to-green-600',    LINK: 'from-blue-400 to-blue-700',
  ARB:  'from-blue-500 to-cyan-400',      OP:  'from-red-400 to-red-600',
};

function TokenAvatar({ symbol }: { symbol: string }) {
  const gradient = SYMBOL_COLORS[symbol] || 'from-gray-400 to-gray-600';
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {symbol.slice(0, 3)}
    </div>
  );
}

function HeatBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-red-500' :
    score >= 60 ? 'bg-orange-400' :
    score >= 40 ? 'bg-yellow-400' : 'bg-blue-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden min-w-[48px]">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)] w-6 text-right">{score}</span>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1)    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (price >= 0.01) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return price.toExponential(3);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  return `$${(vol / 1e3).toFixed(0)}K`;
}

// Loading skeleton rows
function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border-color)]">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[var(--border-color)] rounded animate-pulse" style={{ width: i === 1 ? '120px' : '60px' }} />
        </td>
      ))}
    </tr>
  );
}

export default function TrendingTable({ locale }: { locale: string }) {
  const isEn = locale === 'en';
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [filtered, setFiltered] = useState<TrendingToken[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async (cat: CategoryFilter = 'all') => {
    try {
      const url = cat === 'all' ? '/api/trending' : `/api/trending?cat=${cat}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TrendingToken[] = await res.json();
      setTokens(data);
      setFiltered(data);
      setLastUpdated(new Date());
      setCountdown(60);
    } catch (err) {
      console.error('TrendingTable fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(category); }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchData(category), 60_000);
    const tick = setInterval(() => setCountdown(c => Math.max(c - 1, 0)), 1_000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [category, fetchData]);

  // Filter client-side when category changes
  const handleCategory = (cat: CategoryFilter) => {
    setCategory(cat);
    setLoading(true);
    fetchData(cat);
  };

  const displayTokens = filtered.length ? filtered : tokens;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            🔥 {isEn ? 'Hot Tokens Ranking' : '热门Token排行榜'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {isEn ? 'Powered by OKX real-time data' : '数据来源 OKX 实时行情'}
            {lastUpdated && (
              <span className="ml-2 text-[var(--text-secondary)]/60">
                · {isEn ? 'Updated' : '更新于'} {lastUpdated.toLocaleTimeString()}
                {' '}· {isEn ? `Refresh in ${countdown}s` : `${countdown}s 后刷新`}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(category); }}
          className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded px-2 py-1 transition-colors"
        >
          {isEn ? '↻ Refresh' : '↻ 刷新'}
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-[var(--border-color)] overflow-x-auto scrollbar-hide">
        {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(cat => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              category === cat
                ? 'bg-blue-500 text-white'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            {isEn ? CATEGORY_LABELS[cat].en : CATEGORY_LABELS[cat].zh}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs">
              <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
              <th className="px-4 py-2.5 text-left font-medium">{isEn ? 'Token' : '币种'}</th>
              <th className="px-4 py-2.5 text-right font-medium">{isEn ? 'Price' : '价格'}</th>
              <th className="px-4 py-2.5 text-right font-medium">24h%</th>
              <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">{isEn ? '24h Volume' : '24h 成交量'}</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell min-w-[120px]">{isEn ? 'Heat' : '热度'}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(15)].map((_, i) => <SkeletonRow key={i} />)
              : displayTokens.map(token => {
                  const changePct = token.change24h * 100;
                  const isPositive = changePct >= 0;
                  return (
                    <tr
                      key={token.symbol}
                      className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-primary)]/50 transition-colors"
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                        {token.rank <= 3 ? (
                          <span>{['🥇','🥈','🥉'][token.rank - 1]}</span>
                        ) : (
                          <span className={token.rank <= 10 ? 'text-orange-400 font-bold' : ''}>{token.rank}</span>
                        )}
                      </td>
                      {/* Token */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TokenAvatar symbol={token.symbol} />
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] leading-tight">{token.symbol}</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-tight truncate max-w-[100px]">{token.name}</p>
                          </div>
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--text-primary)]">
                        ${formatPrice(token.price)}
                      </td>
                      {/* 24h Change */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm font-medium tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                        </span>
                      </td>
                      {/* Volume */}
                      <td className="px-4 py-3 text-right text-[var(--text-secondary)] font-mono tabular-nums hidden md:table-cell">
                        {formatVolume(token.volume24h)}
                      </td>
                      {/* Heat Score */}
                      <td className="px-4 py-3 hidden sm:table-cell min-w-[120px]">
                        <HeatBar score={token.heatScore} />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && displayTokens.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
            {isEn ? 'No data available' : '暂无数据'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-xs text-[var(--text-secondary)] border-t border-[var(--border-color)]">
        {isEn
          ? '🔥 Heat score = volume ranking (55%) + price momentum (45%). Top 50 USDT pairs with volume > $1M.'
          : '🔥 热度 = 成交量排名 (55%) + 价格动能 (45%)。筛选24h成交量 > $1M 的前50个USDT交易对。'}
      </div>
    </div>
  );
}
