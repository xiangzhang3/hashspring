'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

const TRENDING_KEYWORDS = [
  'BTC', 'Ethereum', 'Stablecoins', 'DeFi', 'AI', 'ETF',
  'Binance', 'OKX', 'Solana', 'MEME', 'RWA', 'L2',
  'Regulation', 'Airdrop', 'NFT',
];
const TRENDING_ZH: Record<string, string> = {
  Ethereum: '以太坊', Stablecoins: '穩定幣', Binance: '幣安',
  Regulation: '監管', Airdrop: '空投',
};

export function TrendingBar({ locale }: { locale: Locale }) {
  const isZh = locale === 'zh';

  return (
    <div className="mb-5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
      <div className="flex items-center gap-2 flex-nowrap">
        <span className="text-xs font-bold text-gray-400 flex-shrink-0 uppercase tracking-wider">
          {isZh ? '熱搜:' : 'Trending:'}
        </span>
        {TRENDING_KEYWORDS.map((kw) => (
          <Link
            key={kw}
            href={`/${locale}/flashnews?q=${encodeURIComponent(kw)}`}
            prefetch={false}
            className="flex-shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#0066FF] dark:hover:text-[#0066FF] transition-colors no-underline whitespace-nowrap"
          >
            {isZh ? (TRENDING_ZH[kw] || kw) : kw}
          </Link>
        ))}
      </div>
    </div>
  );
}
