import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export interface FlashItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  category: string;
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
        return (
          <div key={item.id}>
            <Link
              href={`/${locale}/flash/${item.id}`}
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
                </div>
                <h3 className="text-[15px] font-semibold leading-relaxed text-gray-900 dark:text-gray-100 tracking-tight">
                  {item.title}
                </h3>
              </div>
            </Link>

            {/* In-Feed Ad after 5th item */}
            {i === 4 && (
              <div className="py-3">
                <div className="bg-gray-50 dark:bg-[#0F1119] border border-gray-200 dark:border-[#1C1F2E] rounded-lg h-[100px] flex items-center justify-center relative">
                  <span className="absolute top-1.5 right-2.5 text-[9px] text-gray-400 font-semibold">{adLabel}</span>
                  <span className="text-gray-400 text-xs">In-Feed Native Ad</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
