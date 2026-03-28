'use client';

import { useEffect, useState, useCallback } from 'react';

interface HeatmapCoin {
  id: string;
  symbol: string;
  name: string;
  change: number;
  mcap: number;
  price: number;
}

const COIN_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
  'cardano', 'dogecoin', 'avalanche-2', 'polkadot', 'chainlink',
  'tron', 'matic-network', 'litecoin', 'uniswap', 'near',
  'internet-computer', 'aptos', 'sui', 'arbitrum', 'optimism',
];

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', binancecoin: 'BNB', solana: 'SOL', ripple: 'XRP',
  cardano: 'ADA', dogecoin: 'DOGE', 'avalanche-2': 'AVAX', polkadot: 'DOT', chainlink: 'LINK',
  tron: 'TRX', 'matic-network': 'POL', litecoin: 'LTC', uniswap: 'UNI', near: 'NEAR',
  'internet-computer': 'ICP', aptos: 'APT', sui: 'SUI', arbitrum: 'ARB', optimism: 'OP',
};

function getHeatColor(change: number): string {
  if (change >= 5) return 'bg-green-600 text-white';
  if (change >= 3) return 'bg-green-500 text-white';
  if (change >= 1) return 'bg-green-500/70 text-white';
  if (change >= 0) return 'bg-green-500/40 text-green-100';
  if (change >= -1) return 'bg-red-500/40 text-red-100';
  if (change >= -3) return 'bg-red-500/70 text-white';
  if (change >= -5) return 'bg-red-500 text-white';
  return 'bg-red-600 text-white';
}

// Size class based on market cap rank
function getSizeClass(index: number): string {
  if (index < 2) return 'col-span-2 row-span-2'; // BTC, ETH
  if (index < 5) return 'col-span-1 row-span-2'; // BNB, SOL, XRP
  return 'col-span-1 row-span-1';
}

export function MarketHeatmap({ locale = 'en' }: { locale?: string }) {
  const [coins, setCoins] = useState<HeatmapCoin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const list: HeatmapCoin[] = COIN_IDS
        .filter((id) => data[id])
        .map((id) => ({
          id,
          symbol: SYMBOL_MAP[id] || id.toUpperCase(),
          name: id.replace(/-/g, ' '),
          change: data[id].usd_24h_change || 0,
          mcap: data[id].usd_market_cap || 0,
          price: data[id].usd || 0,
        }));

      setCoins(list);
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-base font-bold">
          {locale === 'zh' ? '市场热力图' : 'Market Heatmap'}
        </h3>
        <span className="text-[10px] text-gray-400">24h</span>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-4 gap-1.5 auto-rows-[minmax(40px,auto)]">
          {coins.map((coin, i) => (
            <div
              key={coin.id}
              className={`${getSizeClass(i)} ${getHeatColor(coin.change)} rounded-md flex flex-col items-center justify-center p-1.5 cursor-default transition-all hover:brightness-110`}
              title={`$${coin.price.toLocaleString()}`}
            >
              <span className="font-bold text-xs leading-none">{coin.symbol}</span>
              <span className="text-[10px] font-semibold tabular-nums leading-tight mt-0.5">
                {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
