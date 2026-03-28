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
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '', current_price: 95420, market_cap: 1890000000000, total_volume: 42000000000, price_change_percentage_24h: 2.4, market_cap_rank: 1 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: '', current_price: 3580, market_cap: 430000000000, total_volume: 18000000000, price_change_percentage_24h: 1.8, market_cap_rank: 2 },
  { id: 'solana', symbol: 'sol', name: 'Solana', image: '', current_price: 178, market_cap: 82000000000, total_volume: 4200000000, price_change_percentage_24h: 5.2, market_cap_rank: 5 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: '', current_price: 612, market_cap: 91000000000, total_volume: 2100000000, price_change_percentage_24h: -0.3, market_cap_rank: 4 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', image: '', current_price: 2.18, market_cap: 125000000000, total_volume: 6800000000, price_change_percentage_24h: 3.1, market_cap_rank: 3 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', image: '', current_price: 0.72, market_cap: 25000000000, total_volume: 980000000, price_change_percentage_24h: -1.2, market_cap_rank: 8 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: '', current_price: 0.165, market_cap: 24000000000, total_volume: 1800000000, price_change_percentage_24h: 4.5, market_cap_rank: 9 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', image: '', current_price: 38.5, market_cap: 15800000000, total_volume: 720000000, price_change_percentage_24h: -2.1, market_cap_rank: 12 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', image: '', current_price: 7.82, market_cap: 11200000000, total_volume: 380000000, price_change_percentage_24h: 1.5, market_cap_rank: 14 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', image: '', current_price: 18.4, market_cap: 11500000000, total_volume: 620000000, price_change_percentage_24h: 3.8, market_cap_rank: 13 },
  { id: 'tron', symbol: 'trx', name: 'TRON', image: '', current_price: 0.128, market_cap: 11000000000, total_volume: 450000000, price_change_percentage_24h: 0.9, market_cap_rank: 15 },
  { id: 'polygon', symbol: 'matic', name: 'Polygon', image: '', current_price: 0.58, market_cap: 5400000000, total_volume: 310000000, price_change_percentage_24h: -0.7, market_cap_rank: 20 },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap', image: '', current_price: 12.3, market_cap: 7400000000, total_volume: 280000000, price_change_percentage_24h: 6.2, market_cap_rank: 18 },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: '', current_price: 84.5, market_cap: 6300000000, total_volume: 520000000, price_change_percentage_24h: 1.1, market_cap_rank: 19 },
  { id: 'near', symbol: 'near', name: 'NEAR Protocol', image: '', current_price: 5.42, market_cap: 6100000000, total_volume: 340000000, price_change_percentage_24h: 2.9, market_cap_rank: 21 },
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
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d',
          { next: { revalidate: 120 } }
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
