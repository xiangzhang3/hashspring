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

export function FlashFeed({
  items,
  locale,
  adLabel,
}: {
  items: FlashItem[];
  locale: Locale;
  adLabel: string;
}) {
  return (
    <div>
      {items.map((item, i) => {
        const lc = levelColors[item.level];
        // Always link to internal detail page — encode the id for URL safety
        const href = `/${locale}/flash/${encodeURIComponent(item.id)}`;

        return (
          <div key={item.id}>
            <Link
              href={href}
              className="flex gap-3.5 py-4 border-b border-gray-200 dark:border-[#1C1F2E] no-underline hover:opacity-90 transition-opacity"
            >
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
                  <span className="text-[10px] font-bold text-brand-blue bg-gray-50 dark:bg-[#0F1119] px-1.5 py-px rounded tracking-wide">
                    {item.category}
                  </span>
                  {item.source && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {item.source}
                    </span>
                  )}
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-semibold leading-relaxed text-gray-900 dark:text-gray-100 tracking-tight line-clamp-3">
                  {item.title}
                </h3>
              </div>
            </Link>

            {/* In-Feed Ad after 5th item — LBank x Argentina */}
            {i === 4 && (
              <LBankAdInFeed label={adLabel} />
            )}
          </div>
        );
      })}
    </div>
  );
}
