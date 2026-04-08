'use client';

import { useEffect, useState } from 'react';

interface ChainTVL {
  name: string;
  tvl: number;
  change_1d: number;
}

interface DefiData {
  totalTvl: number;
  change24h: number;
  topChains: ChainTVL[];
  protocolCount: number;
  updatedAt: number;
}

// Chain logo emoji mapping (fallback until we add real logos)
const CHAIN_ICONS: Record<string, string> = {
  Ethereum: '⟠',
  Tron: '◈',
  Solana: '◎',
  BSC: '⬡',
  Bitcoin: '₿',
  Arbitrum: '🔵',
  Base: '🔷',
  Polygon: '⬣',
  Avalanche: '🔺',
  Sui: '💧',
  Optimism: '🔴',
  Aptos: '🟣',
};

function formatTVL(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

// TVL bar width relative to max
function BarFill({ ratio }: { ratio: number }) {
  return (
    <div className="h-1.5 rounded-full bg-[var(--border-color)] w-full overflow-hidden">
      <div
        className="h-full rounded-full bg-blue-500/60 transition-all duration-500"
        style={{ width: `${Math.max(ratio * 100, 2)}%` }}
      />
    </div>
  );
}

export default function DefiTVLWidget({ locale = 'en' }: { locale?: string }) {
  const [data, setData] = useState<DefiData | null>(null);
  const [loading, setLoading] = useState(true);
  const isEn = locale === 'en';

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/defi-tvl');
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
    const interval = setInterval(fetchData, 10 * 60 * 1000); // refresh 10 min
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-28 bg-[var(--border-color)] rounded" />
          <div className="h-6 w-36 bg-[var(--border-color)] rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 bg-[var(--border-color)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxTvl = data.topChains[0]?.tvl || 1;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {isEn ? 'DeFi Total Value Locked' : 'DeFi 总锁仓量'}
        </h3>
        <span className="text-[10px] text-[var(--text-secondary)]">
          DeFi Llama
        </span>
      </div>

      {/* Total TVL */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
          {formatTVL(data.totalTvl)}
        </span>
        {data.change24h !== 0 && (
          <span className={`text-xs font-medium tabular-nums ${
            data.change24h >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Protocol count */}
      {data.protocolCount > 0 && (
        <p className="text-[10px] text-[var(--text-secondary)] mb-3">
          {data.protocolCount.toLocaleString()} {isEn ? 'protocols tracked' : '个协议'}
        </p>
      )}

      {/* Top chains list */}
      <div className="space-y-2">
        {data.topChains.slice(0, 8).map((chain, i) => (
          <div key={chain.name} className="flex items-center gap-2">
            {/* Rank */}
            <span className="text-[10px] text-[var(--text-secondary)] w-3 text-right tabular-nums">
              {i + 1}
            </span>
            {/* Chain icon */}
            <span className="text-xs w-4 text-center">
              {CHAIN_ICONS[chain.name] || '⬢'}
            </span>
            {/* Name + TVL */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {chain.name}
                </span>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums ml-2">
                  {formatTVL(chain.tvl)}
                </span>
              </div>
              <BarFill ratio={chain.tvl / maxTvl} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
