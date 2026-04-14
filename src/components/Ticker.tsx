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

// Placeholder shown only during initial load — replaced as soon as first API call succeeds
const LOADING_COINS: CoinPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'ETH', name: 'Ethereum', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'SOL', name: 'Solana', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'BNB', name: 'BNB', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'XRP', name: 'XRP', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'ADA', name: 'Cardano', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'DOGE', name: 'Dogecoin', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
  { symbol: 'AVAX', name: 'Avalanche', price: '—', priceRaw: 0, change24h: '—', up: true, flash: null },
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
  const [coins, setCoins] = useState<CoinPrice[]>(LOADING_COINS);
  const [isLive, setIsLive] = useState(false);
  const [x, setX] = useState(0);
  const prevPricesRef = useRef<Record<string, number>>({});
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const failCountRef = useRef(0);
  const lastSuccessRef = useRef<number>(0);

  const fetchPrices = useCallback(async () => {
    try {
      // Add cache-bust param to avoid edge cache serving stale data
      const res = await fetch(
        `/api/prices?type=simple&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const order = COINGECKO_IDS.split(',');
      const prevPrices = prevPricesRef.current;

      const live: CoinPrice[] = order
        .filter((id) => data[id]?.usd)
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
            change24h: Math.abs(info.usd_24h_change ?? 0).toFixed(2),
            up: (info.usd_24h_change ?? 0) >= 0,
            flash,
          };
        });

      if (live.length > 0) {
        setCoins(live);
        setIsLive(true);
        failCountRef.current = 0;
        lastSuccessRef.current = Date.now();

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
      failCountRef.current += 1;
      // If data is older than 5 minutes and API keeps failing, show stale indicator
      if (lastSuccessRef.current > 0 && Date.now() - lastSuccessRef.current > 5 * 60 * 1000) {
        setIsLive(false);
      }
    }
  }, []);

  // Fetch live prices with adaptive interval:
  // Normal: 10s, After failures: back off to 30s to avoid rate limits
  useEffect(() => {
    fetchPrices();
    const getInterval = () => failCountRef.current > 3 ? 30_000 : 10_000;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        fetchPrices();
        schedule();
      }, getInterval());
    };
    schedule();
    return () => {
      clearTimeout(timer);
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
      {!isLive && coins[0]?.price !== '—' && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-yellow-500/60 text-[10px] animate-pulse">
          reconnecting...
        </div>
      )}
      <div
        className="flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: `translateX(${x % 2000}px)` }}
      >
        {items.map((coin, i) => {
          const isLoading = coin.price === '—';
          // Flash color classes
          const priceColor = isLoading
            ? 'text-gray-600 animate-pulse'
            : coin.flash === 'up'
              ? 'text-green-400 ticker-flash-up'
              : coin.flash === 'down'
                ? 'text-red-400 ticker-flash-down'
                : 'text-gray-200';

          return (
            <div key={i} className="inline-flex items-center gap-2 px-5 border-r border-gray-800">
              <span className="text-gray-500 text-xs font-bold">{coin.symbol}</span>
              <span className={`text-[13px] font-semibold tabular-nums transition-colors duration-300 ${priceColor}`}>
                {isLoading ? '—' : `$${coin.price}`}
              </span>
              {!isLoading && (
                <span className={`text-xs font-bold tabular-nums ${coin.up ? 'text-green-500' : 'text-red-500'}`}>
                  {coin.up ? '▲' : '▼'} {coin.up ? '+' : '-'}{coin.change24h}%
                </span>
              )}
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
