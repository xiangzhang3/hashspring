'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

const TRENDING_KEYWORDS = [
  'BTC', 'Ethereum', 'Stablecoins', 'DeFi', 'AI', 'ETF',
  'Binance', 'OKX', 'Solana', 'MEME', 'RWA', 'L2',
  'Regulation', 'Airdrop', 'NFT',
];

export function TrendingBar({ locale }: { locale: Locale }) {
  const isZh = locale === 'zh';

  return (
    <div className="mb-5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
      <div className="flex items-center gap-2 flex-nowrap">
        <span className="text-[11px] font-bold text-gray-400 flex-shrink-0 uppercase tracking-wider">
          {isZh ? '熱搜:' : 'Trending:'}
        </span>
        {TRENDING_KEYWORDS.map((kw) => (
          <Link
            key={kw}
            href={`/${locale}/flashnews?q=${encodeURIComponent(kw)}`}
            className="flex-shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-[#0066FF] dark:hover:text-[#0066FF] transition-colors no-underline whitespace-nowrap"
          >
            {kw}
          </Link>
        ))}
      </div>
    </div>
  );
}
