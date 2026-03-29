'use client';

import { useState, useEffect } from 'react';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  market_cap_rank: number;
}

const FALLBACK_DATA: CoinData[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '', current_price: 66600, market_cap: 1320000000000, total_volume: 28000000000, price_change_percentage_24h: 0.91, market_cap_rank: 1 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: '', current_price: 2020, market_cap: 243000000000, total_volume: 12000000000, price_change_percentage_24h: -1.24, market_cap_rank: 2 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', image: '', current_price: 1.35, market_cap: 78000000000, total_volume: 3200000000, price_change_percentage_24h: -0.87, market_cap_rank: 3 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: '', current_price: 616, market_cap: 89000000000, total_volume: 1500000000, price_change_percentage_24h: 0.43, market_cap_rank: 4 },
  { id: 'solana', symbol: 'sol', name: 'Solana', image: '', current_price: 83.31, market_cap: 43000000000, total_volume: 2800000000, price_change_percentage_24h: -2.15, market_cap_rank: 5 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', image: '', current_price: 0.26, market_cap: 9400000000, total_volume: 320000000, price_change_percentage_24h: -1.52, market_cap_rank: 8 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: '', current_price: 0.091, market_cap: 15400000000, total_volume: 1020000000, price_change_percentage_24h: 0.91, market_cap_rank: 9 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', image: '', current_price: 9.12, market_cap: 3930000000, total_volume: 180000000, price_change_percentage_24h: -5.55, market_cap_rank: 12 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', image: '', current_price: 3.82, market_cap: 5800000000, total_volume: 150000000, price_change_percentage_24h: -1.8, market_cap_rank: 14 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', image: '', current_price: 10.2, market_cap: 6800000000, total_volume: 320000000, price_change_percentage_24h: -2.1, market_cap_rank: 13 },
  { id: 'tron', symbol: 'trx', name: 'TRON', image: '', current_price: 0.22, market_cap: 19000000000, total_volume: 450000000, price_change_percentage_24h: 0.5, market_cap_rank: 7 },
  { id: 'polygon', symbol: 'matic', name: 'Polygon', image: '', current_price: 0.18, market_cap: 1800000000, total_volume: 120000000, price_change_percentage_24h: -1.3, market_cap_rank: 20 },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap', image: '', current_price: 5.4, market_cap: 3200000000, total_volume: 110000000, price_change_percentage_24h: -2.8, market_cap_rank: 18 },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: '', current_price: 68.5, market_cap: 5100000000, total_volume: 350000000, price_change_percentage_24h: 0.6, market_cap_rank: 19 },
  { id: 'near', symbol: 'near', name: 'NEAR Protocol', image: '', current_price: 2.5, market_cap: 3000000000, total_volume: 140000000, price_change_percentage_24h: -3.2, market_cap_rank: 21 },
];

export default function MarketTable({ locale }: { locale: string }) {
  const [coins, setCoins] = useState<CoinData[]>(FALLBACK_DATA);
  const [sortBy, setSortBy] = useState<'market_cap_rank' | 'current_price' | 'price_change_percentage_24h' | 'market_cap' | 'total_volume'>('market_cap_rank');
  const [sortAsc, setSortAsc] = useState(true);
  const isEn = locale === 'en';

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch(
          '/api/prices?type=markets',
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setCoins(data);
        }
      } catch {
        // keep fallback
      }
    };
    fetchMarket();
    const timer = setInterval(fetchMarket, 120000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(col === 'market_cap_rank'); }
  };

  const sorted = [...coins].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    return ((a[sortBy] ?? 0) - (b[sortBy] ?? 0)) * mul;
  });

  const fmt = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  };

  const fmtPrice = (p: number) => {
    if (p >= 1000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(4)}`;
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-1 text-xs opacity-50">{sortBy === col ? (sortAsc ? '▲' : '▼') : '↕'}</span>
  );

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {isEn ? 'Top Cryptocurrencies by Market Cap' : '市值排名前列的加密貨幣'}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('market_cap_rank')}>
                # <SortIcon col="market_cap_rank" />
              </th>
              <th className="text-left px-4 py-3 font-medium">{isEn ? 'Name' : '名稱'}</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('current_price')}>
                {isEn ? 'Price' : '價格'} <SortIcon col="current_price" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('price_change_percentage_24h')}>
                24h % <SortIcon col="price_change_percentage_24h" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] hidden md:table-cell" onClick={() => handleSort('market_cap')}>
                {isEn ? 'Market Cap' : '市值'} <SortIcon col="market_cap" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] hidden lg:table-cell" onClick={() => handleSort('total_volume')}>
                {isEn ? '24h Volume' : '24h 成交量'} <SortIcon col="total_volume" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((coin) => (
              <tr key={coin.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-4 py-3 text-[var(--text-secondary)] tabular-nums">{coin.market_cap_rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {coin.image && <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />}
                    <span className="font-medium text-[var(--text-primary)]">{coin.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] uppercase">{coin.symbol}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] tabular-nums">
                  {fmtPrice(coin.current_price)}
                </td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)] tabular-nums hidden md:table-cell">
                  {fmt(coin.market_cap)}
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)] tabular-nums hidden lg:table-cell">
                  {fmt(coin.total_volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
