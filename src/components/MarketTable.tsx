'use client';
import Image from 'next/image';

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

// No hardcoded fallback — show loading skeleton until real API data arrives

export default function MarketTable({ locale }: { locale: string }) {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'market_cap_rank' | 'current_price' | 'price_change_percentage_24h' | 'market_cap' | 'total_volume'>('market_cap_rank');
  const [sortAsc, setSortAsc] = useState(true);
  const isEn = locale === 'en';
  const isFil = locale === 'fil';

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
        // silent
      } finally {
        setLoading(false);
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

  // Loading skeleton
  if (loading && coins.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isEn ? 'Top Cryptocurrencies by Market Cap' : isFil ? 'Nangungunang Cryptocurrency ayon sa Market Cap' : '市值排名前列的加密貨幣'}
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-5 h-4 bg-[var(--border-color)] rounded" />
                <div className="w-6 h-6 bg-[var(--border-color)] rounded-full" />
                <div className="w-20 h-4 bg-[var(--border-color)] rounded" />
              </div>
              <div className="flex items-center gap-6">
                <div className="w-20 h-4 bg-[var(--border-color)] rounded" />
                <div className="w-14 h-4 bg-[var(--border-color)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No data after loading
  if (!loading && coins.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-8 text-center">
        <p className="text-[var(--text-secondary)] text-sm">
          {isEn ? 'Market data temporarily unavailable. Please try again later.' : isFil ? 'Pansamantalang hindi available ang market data.' : '行情數據暫時無法取得，請稍後再試。'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {isEn ? 'Top Cryptocurrencies by Market Cap' : isFil ? 'Nangungunang Cryptocurrency ayon sa Market Cap' : '市值排名前列的加密貨幣'}
        </h2>
      </div>
      <div className="overflow-x-auto relative">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent pointer-events-none md:hidden z-10" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('market_cap_rank')} aria-sort={sortBy === 'market_cap_rank' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                # <SortIcon col="market_cap_rank" />
              </th>
              <th className="text-left px-4 py-3 font-medium">{isEn ? 'Name' : isFil ? 'Pangalan' : '名稱'}</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('current_price')} aria-sort={sortBy === 'current_price' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                {isEn ? 'Price' : isFil ? 'Presyo' : '價格'} <SortIcon col="current_price" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('price_change_percentage_24h')} aria-sort={sortBy === 'price_change_percentage_24h' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                24h % <SortIcon col="price_change_percentage_24h" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] hidden md:table-cell" onClick={() => handleSort('market_cap')} aria-sort={sortBy === 'market_cap' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                {isEn ? 'Market Cap' : isFil ? 'Market Cap' : '市值'} <SortIcon col="market_cap" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] hidden lg:table-cell" onClick={() => handleSort('total_volume')} aria-sort={sortBy === 'total_volume' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                {isEn ? '24h Volume' : isFil ? '24h Volume' : '24h 成交量'} <SortIcon col="total_volume" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((coin) => (
              <tr key={coin.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors">
                <td className="px-4 py-3 text-[var(--text-secondary)] tabular-nums">{coin.market_cap_rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {coin.image && <Image src={coin.image} alt={coin.name} width={24} height={24} className="w-6 h-6 rounded-full" />}
                    <span className="font-medium text-[var(--text-primary)]">{coin.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] uppercase">{coin.symbol}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)] tabular-nums">
                  {fmtPrice(coin.current_price)}
                </td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${(coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}{(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
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
