'use client';

import type { Dictionary } from '@/lib/i18n';
import { useEffect, useState, useRef, useCallback } from 'react';

interface MarketCoin {
  s: string;      // symbol
  n: string;      // name
  p: string;      // price formatted
  pRaw: number;   // price raw for comparison
  c: string;      // 24h change
  u: boolean;     // up?
  flash?: 'up' | 'down' | null; // flash animation state
}

const FALLBACK_COINS: MarketCoin[] = [
  { s: 'BTC', n: 'Bitcoin', p: '95,234.56', pRaw: 95234.56, c: '+3.42', u: true },
  { s: 'ETH', n: 'Ethereum', p: '3,847.12', pRaw: 3847.12, c: '+2.18', u: true },
  { s: 'SOL', n: 'Solana', p: '187.45', pRaw: 187.45, c: '-1.05', u: false },
  { s: 'BNB', n: 'BNB', p: '612.33', pRaw: 612.33, c: '+0.87', u: true },
  { s: 'XRP', n: 'XRP', p: '2.34', pRaw: 2.34, c: '+5.12', u: true },
];

const COINGECKO_IDS = 'bitcoin,ethereum,solana,binancecoin,ripple';
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB', ripple: 'XRP',
};
const NAME_MAP: Record<string, string> = {
  bitcoin: 'Bitcoin', ethereum: 'Ethereum', solana: 'Solana', binancecoin: 'BNB', ripple: 'XRP',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export function MarketWidget({ dict }: { dict: Dictionary }) {
  const [coins, setCoins] = useState<MarketCoin[]>(FALLBACK_COINS);
  const prevPricesRef = useRef<Record<string, number>>({});
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const order = COINGECKO_IDS.split(',');
      const prevPrices = prevPricesRef.current;

      const live: MarketCoin[] = order
        .filter((id) => data[id])
        .map((id) => {
          const info = data[id];
          const rawPrice = info.usd as number;
          const prevPrice = prevPrices[id];
          let flash: 'up' | 'down' | null = null;

          if (prevPrice !== undefined && prevPrice !== rawPrice) {
            flash = rawPrice > prevPrice ? 'up' : 'down';
          }

          // Update previous price
          prevPricesRef.current[id] = rawPrice;

          return {
            s: SYMBOL_MAP[id] || id.toUpperCase(),
            n: NAME_MAP[id] || id,
            p: formatPrice(rawPrice),
            pRaw: rawPrice,
            c: (info.usd_24h_change >= 0 ? '+' : '') + Math.abs(info.usd_24h_change).toFixed(2),
            u: info.usd_24h_change >= 0,
            flash,
          };
        });

      if (live.length > 0) {
        setCoins(live);

        // Clear flash after 1.2s
        live.forEach((coin) => {
          if (coin.flash) {
            if (flashTimersRef.current[coin.s]) {
              clearTimeout(flashTimersRef.current[coin.s]);
            }
            flashTimersRef.current[coin.s] = setTimeout(() => {
              setCoins((prev) =>
                prev.map((c) => (c.s === coin.s ? { ...c, flash: null } : c))
              );
            }, 1200);
          }
        });
      }
    } catch {
      // Keep current data
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    // 每 10 秒刷新（参照币安/OKX行情频率）
    const interval = setInterval(fetchPrices, 10_000);
    return () => {
      clearInterval(interval);
      Object.values(flashTimersRef.current).forEach(clearTimeout);
    };
  }, [fetchPrices]);

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header with live dot */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold">{dict.sectionMarket}</h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="text-[10px] text-gray-400 tabular-nums">LIVE</span>
      </div>

      {/* Coin rows */}
      <div>
        {coins.map((coin, i) => {
          // Flash background color
          const flashBg = coin.flash === 'up'
            ? 'animate-flash-green'
            : coin.flash === 'down'
              ? 'animate-flash-red'
              : '';

          return (
            <div
              key={coin.s}
              className={`flex items-center justify-between px-4 py-3 transition-colors duration-300 ${flashBg} ${
                i < coins.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div>
                <div className="font-bold text-sm">{coin.s}</div>
                <div className="text-[11px] text-gray-400">{coin.n}</div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-sm tabular-nums transition-colors duration-300 ${
                  coin.flash === 'up' ? 'text-green-500' : coin.flash === 'down' ? 'text-red-500' : ''
                }`}>
                  ${coin.p}
                </div>
                <div className={`text-xs font-bold tabular-nums ${coin.u ? 'text-green-500' : 'text-red-500'}`}>
                  {coin.u ? '▲' : '▼'} {coin.c}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline keyframes for flash animations */}
      <style jsx>{`
        @keyframes flashGreen {
          0%   { background-color: transparent; }
          15%  { background-color: rgba(34, 197, 94, 0.15); }
          100% { background-color: transparent; }
        }
        @keyframes flashRed {
          0%   { background-color: transparent; }
          15%  { background-color: rgba(239, 68, 68, 0.15); }
          100% { background-color: transparent; }
        }
        .animate-flash-green {
          animation: flashGreen 1.2s ease-out;
        }
        .animate-flash-red {
          animation: flashRed 1.2s ease-out;
        }
      `}</style>
    </div>
  );
}
