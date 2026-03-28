import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { LBankAdInFeed } from './LBankAd';

export interface FlashItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  category: string;
  source?: string;
  link?: string;
}

const levelColors = {
  red: { dot: 'bg-red-500', shadow: 'shadow-[0_0_6px_rgba(255,59,48,0.3)]' },
  orange: { dot: 'bg-orange-500', shadow: '' },
  blue: { dot: 'bg-brand-blue', shadow: '' },
};

// ── Extract keywords from title for internal linking ──
function extractInternalLinks(title: string, locale: Locale): Array<{ text: string; href: string }> {
  const links: Array<{ text: string; href: string }> = [];
  const keywords: Record<string, string> = {
    'Bitcoin': 'bitcoin', 'BTC': 'bitcoin', '比特币': 'bitcoin',
    'Ethereum': 'ethereum', 'ETH': 'ethereum', '以太坊': 'ethereum',
    'Solana': 'solana', 'SOL': 'solana',
    'DeFi': 'defi', 'NFT': 'nft',
    'Binance': 'exchange', 'Coinbase': 'exchange', 'OKX': 'exchange',
    'SEC': 'regulation', '监管': 'regulation',
  };
  for (const [keyword, slug] of Object.entries(keywords)) {
    if (title.includes(keyword)) {
      links.push({ text: keyword, href: `/${locale}/category/${slug}` });
      if (links.length >= 2) break; // max 2 internal links per item
    }
  }
  return links;
}

export function FlashFeed({
  items,
  locale,
  adLabel,
}: {
  items: FlashItem[];
  locale: Locale;
  adLabel: string;
}) {
  const isZh = locale === 'zh';

  return (
    <div>
      {items.map((item, i) => {
        const lc = levelColors[item.level];
        const href = `/${locale}/flash/${encodeURIComponent(item.id)}`;
        const internalLinks = extractInternalLinks(item.title, locale);

        return (
          <div key={item.id}>
            <div className="flex gap-3.5 py-4 border-b border-gray-200 dark:border-[#1C1F2E]">
              {/* Time */}
              <div className="w-12 flex-shrink-0 text-right pt-0.5">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{item.time}</span>
              </div>

              {/* Dot */}
              <div className="pt-[7px] flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${lc.dot} ${lc.shadow}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link
                    href={`/${locale}/category/${item.category.toLowerCase()}`}
                    className="text-[10px] font-bold text-brand-blue bg-gray-50 dark:bg-[#0F1119] px-1.5 py-px rounded tracking-wide no-underline hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {item.category}
                  </Link>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {isZh ? '据 hashspring.com' : 'via hashspring.com'}
                  </span>
                </div>
                {/* Title — links to detail page */}
                <Link href={href} className="no-underline hover:opacity-90 transition-opacity">
                  <h3 className="text-[14px] sm:text-[15px] font-semibold leading-relaxed text-gray-900 dark:text-gray-100 tracking-tight line-clamp-3">
                    {item.title}
                  </h3>
                </Link>
                {/* Internal anchor links for SEO */}
                {internalLinks.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {internalLinks.map((il) => (
                      <Link
                        key={il.href}
                        href={il.href}
                        className="text-[10px] text-blue-500 hover:text-blue-600 no-underline hover:underline"
                      >
                        #{il.text}
                      </Link>
                    ))}
                    {item.source && (
                      <span className="text-[10px] text-gray-400">· {item.source}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* In-Feed Ad after 5th item — LBank x AFA */}
            {i === 4 && (
              <LBankAdInFeed label={adLabel} />
            )}
          </div>
        );
      })}
    </div>
  );
}
