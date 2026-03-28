'use client';

import type { Dictionary } from '@/lib/i18n';
import { useEffect, useState } from 'react';

interface MarketCoin {
  s: string;
  n: string;
  p: string;
  c: string;
  u: boolean;
}

const FALLBACK_COINS: MarketCoin[] = [
  { s: 'BTC', n: 'Bitcoin', p: '95,234.56', c: '+3.42', u: true },
  { s: 'ETH', n: 'Ethereum', p: '3,847.12', c: '+2.18', u: true },
  { s: 'SOL', n: 'Solana', p: '187.45', c: '-1.05', u: false },
  { s: 'BNB', n: 'BNB', p: '612.33', c: '+0.87', u: true },
  { s: 'XRP', n: 'XRP', p: '2.34', c: '+5.12', u: true },
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

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        const live: MarketCoin[] = Object.entries(data).map(([id, info]: [string, any]) => ({
          s: SYMBOL_MAP[id] || id.toUpperCase(),
          n: NAME_MAP[id] || id,
          p: formatPrice(info.usd),
          c: (info.usd_24h_change >= 0 ? '+' : '') + Math.abs(info.usd_24h_change).toFixed(2),
          u: info.usd_24h_change >= 0,
        }));

        // Sort by order defined in COINGECKO_IDS
        const order = COINGECKO_IDS.split(',');
        live.sort((a, b) => {
          const idA = Object.entries(SYMBOL_MAP).find(([, s]) => s === a.s)?.[0] || '';
          const idB = Object.entries(SYMBOL_MAP).find(([, s]) => s === b.s)?.[0] || '';
          return order.indexOf(idA) - order.indexOf(idB);
        });

        if (live.length > 0) setCoins(live);
      } catch {
        // Keep fallback data
      }
    }

    fetchPrices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-base font-bold">{dict.sectionMarket}</h3>
      </div>
      <div>
        {coins.map((coin, i) => (
          <div key={coin.s} className={`flex items-center justify-between px-4 py-3 ${i < coins.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
            <div>
              <div className="font-bold text-sm">{coin.s}</div>
              <div className="text-[11px] text-gray-400">{coin.n}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sm tabular-nums">${coin.p}</div>
              <div className={`text-xs font-bold tabular-nums ${coin.u ? 'text-green-500' : 'text-red-500'}`}>
                {coin.c}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
