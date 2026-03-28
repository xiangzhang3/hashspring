import type { Dictionary } from '@/lib/i18n';

const coins = [
  { s: 'BTC', n: 'Bitcoin', p: '95,234.56', c: '+3.42', u: true },
  { s: 'ETH', n: 'Ethereum', p: '3,847.12', c: '+2.18', u: true },
  { s: 'SOL', n: 'Solana', p: '187.45', c: '-1.05', u: false },
  { s: 'BNB', n: 'BNB', p: '612.33', c: '+0.87', u: true },
  { s: 'XRP', n: 'XRP', p: '2.34', c: '+5.12', u: true },
];

export function MarketWidget({ dict }: { dict: Dictionary }) {
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
                {coin.u ? '+' : ''}{coin.c}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
