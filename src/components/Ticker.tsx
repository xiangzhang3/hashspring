'use client';

import { useEffect, useState } from 'react';

interface CoinPrice {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  up: boolean;
}

// Fallback static data in case API fails
const FALLBACK_COINS: CoinPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '95,234.56', change24h: '3.42', up: true },
  { symbol: 'ETH', name: 'Ethereum', price: '3,847.12', change24h: '2.18', up: true },
  { symbol: 'SOL', name: 'Solana', price: '187.45', change24h: '1.05', up: false },
  { symbol: 'BNB', name: 'BNB', price: '612.33', change24h: '0.87', up: true },
  { symbol: 'XRP', name: 'XRP', price: '2.34', change24h: '5.12', up: true },
  { symbol: 'ADA', name: 'Cardano', price: '0.892', change24h: '0.43', up: false },
  { symbol: 'DOGE', name: 'Dogecoin', price: '0.1823', change24h: '2.15', up: true },
  { symbol: 'AVAX', name: 'Avalanche', price: '42.67', change24h: '1.89', up: true },
];

// CoinGecko IDs mapping
const COINGECKO_IDS = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,avalanche-2';
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', 'avalanche-2': 'AVAX',
};
const NAME_MAP: Record<string, string> = {
  bitcoin: 'Bitcoin', ethereum: 'Ethereum', solana: 'Solana', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'Cardano', dogecoin: 'Dogecoin', 'avalanche-2': 'Avalanche',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export function Ticker() {
  const [coins, setCoins] = useState<CoinPrice[]>(FALLBACK_COINS);
  const [x, setX] = useState(0);

  // Fetch live prices from CoinGecko
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`,
          { next: { revalidate: 60 } } // Cache for 60s
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        const live: CoinPrice[] = Object.entries(data).map(([id, info]: [string, any]) => ({
          symbol: SYMBOL_MAP[id] || id.toUpperCase(),
          name: NAME_MAP[id] || id,
          price: formatPrice(info.usd),
          change24h: Math.abs(info.usd_24h_change).toFixed(2),
          up: info.usd_24h_change >= 0,
        }));

        // Sort by market cap order (same as COINGECKO_IDS order)
        const order = COINGECKO_IDS.split(',');
        live.sort((a, b) => {
          const idA = Object.entries(SYMBOL_MAP).find(([, s]) => s === a.symbol)?.[0] || '';
          const idB = Object.entries(SYMBOL_MAP).find(([, s]) => s === b.symbol)?.[0] || '';
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

  // Scroll animation
  useEffect(() => {
    const id = setInterval(() => setX((p) => p - 0.8), 20);
    return () => clearInterval(id);
  }, []);

  const items = [...coins, ...coins, ...coins, ...coins];

  return (
    <div className="bg-[#0f1419] h-10 overflow-hidden flex items-center">
      <div
        className="flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: `translateX(${x % 2000}px)` }}
      >
        {items.map((coin, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-5 border-r border-gray-800">
            <span className="text-gray-500 text-xs font-bold">{coin.symbol}</span>
            <span className="text-gray-200 text-[13px] font-semibold tabular-nums">${coin.price}</span>
            <span className={`text-xs font-bold tabular-nums ${coin.up ? 'text-green-500' : 'text-red-500'}`}>
              {coin.up ? '+' : '-'}{coin.change24h}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
