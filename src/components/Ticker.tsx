'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface CoinPrice {
  symbol: string;
  name: string;
  price: string;
  priceRaw: number;
  change24h: string;
  up: boolean;
  flash: 'up' | 'down' | null;
}

const FALLBACK_COINS: CoinPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '95,234.56', priceRaw: 95234.56, change24h: '3.42', up: true, flash: null },
  { symbol: 'ETH', name: 'Ethereum', price: '3,847.12', priceRaw: 3847.12, change24h: '2.18', up: true, flash: null },
  { symbol: 'SOL', name: 'Solana', price: '187.45', priceRaw: 187.45, change24h: '1.05', up: false, flash: null },
  { symbol: 'BNB', name: 'BNB', price: '612.33', priceRaw: 612.33, change24h: '0.87', up: true, flash: null },
  { symbol: 'XRP', name: 'XRP', price: '2.34', priceRaw: 2.34, change24h: '5.12', up: true, flash: null },
  { symbol: 'ADA', name: 'Cardano', price: '0.892', priceRaw: 0.892, change24h: '0.43', up: false, flash: null },
  { symbol: 'DOGE', name: 'Dogecoin', price: '0.1823', priceRaw: 0.1823, change24h: '2.15', up: true, flash: null },
  { symbol: 'AVAX', name: 'Avalanche', price: '42.67', priceRaw: 42.67, change24h: '1.89', up: true, flash: null },
];

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

      const live: CoinPrice[] = order
        .filter((id) => data[id])
        .map((id) => {
          const info = data[id];
          const rawPrice = info.usd as number;
          const prev = prevPrices[id];
          let flash: 'up' | 'down' | null = null;

          if (prev !== undefined && prev !== rawPrice) {
            flash = rawPrice > prev ? 'up' : 'down';
          }
          prevPricesRef.current[id] = rawPrice;

          return {
            symbol: SYMBOL_MAP[id] || id.toUpperCase(),
            name: NAME_MAP[id] || id,
            price: formatPrice(rawPrice),
            priceRaw: rawPrice,
            change24h: Math.abs(info.usd_24h_change).toFixed(2),
            up: info.usd_24h_change >= 0,
            flash,
          };
        });

      if (live.length > 0) {
        setCoins(live);

        // Clear flash after 1.5s
        live.forEach((coin) => {
          if (coin.flash) {
            if (flashTimersRef.current[coin.symbol]) {
              clearTimeout(flashTimersRef.current[coin.symbol]);
            }
            flashTimersRef.current[coin.symbol] = setTimeout(() => {
              setCoins((prev) =>
                prev.map((c) => (c.symbol === coin.symbol ? { ...c, flash: null } : c))
              );
            }, 1500);
          }
        });
      }
    } catch {
      // Keep current data
    }
  }, []);

  // Fetch live prices — 10s interval (参照币安/OKX行情)
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10_000);
    return () => {
      clearInterval(interval);
      Object.values(flashTimersRef.current).forEach(clearTimeout);
    };
  }, [fetchPrices]);

  // Smooth scroll animation
  useEffect(() => {
    const id = setInterval(() => setX((p) => p - 0.8), 20);
    return () => clearInterval(id);
  }, []);

  const items = [...coins, ...coins, ...coins, ...coins];

  return (
    <div className="bg-[#0f1419] h-10 overflow-hidden flex items-center relative">
      <div
        className="flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: `translateX(${x % 2000}px)` }}
      >
        {items.map((coin, i) => {
          // Flash color classes
          const priceColor = coin.flash === 'up'
            ? 'text-green-400 ticker-flash-up'
            : coin.flash === 'down'
              ? 'text-red-400 ticker-flash-down'
              : 'text-gray-200';

          return (
            <div key={i} className="inline-flex items-center gap-2 px-5 border-r border-gray-800">
              <span className="text-gray-500 text-xs font-bold">{coin.symbol}</span>
              <span className={`text-[13px] font-semibold tabular-nums transition-colors duration-300 ${priceColor}`}>
                ${coin.price}
              </span>
              <span className={`text-xs font-bold tabular-nums ${coin.up ? 'text-green-500' : 'text-red-500'}`}>
                {coin.up ? '▲' : '▼'} {coin.up ? '+' : '-'}{coin.change24h}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Flash animation styles */}
      <style jsx>{`
        @keyframes tickerFlashUp {
          0%   { text-shadow: none; }
          20%  { text-shadow: 0 0 8px rgba(34, 197, 94, 0.6); }
          100% { text-shadow: none; }
        }
        @keyframes tickerFlashDown {
          0%   { text-shadow: none; }
          20%  { text-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
          100% { text-shadow: none; }
        }
        .ticker-flash-up {
          animation: tickerFlashUp 1.5s ease-out;
        }
        .ticker-flash-down {
          animation: tickerFlashDown 1.5s ease-out;
        }
      `}</style>
    </div>
  );
}
