'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';

/** Bottom-right breaking news toast popup (clickable to detail page) */
export default function BreakingToast({ item, locale, onClose }: { item: FlashItem; locale: Locale; onClose: () => void }) {
  const isRed = item.level === 'red';
  const detailUrl = `/${locale}/flash/${encodeURIComponent(item.id)}`;

  useEffect(() => {
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] animate-[toast-in_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <a
        href={detailUrl}
        className={`block relative rounded-2xl shadow-2xl border overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] no-underline ${
          isRed
            ? 'bg-gradient-to-br from-red-50 to-red-100/80 dark:from-red-950 dark:to-red-900/80 border-red-200/80 dark:border-red-800/60 shadow-red-500/25'
            : 'bg-gradient-to-br from-orange-50 to-amber-50/80 dark:from-orange-950 dark:to-amber-900/80 border-orange-200/80 dark:border-orange-800/60 shadow-orange-500/25'
        }`}
      >
        {/* Top gradient bar */}
        <div className={`h-1 ${
          isRed
            ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600'
            : 'bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500'
        } animate-[flash-bar_1.5s_ease-in-out_2]`} />

        <div className="p-4">
          {/* Header: label + source + close */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                isRed
                  ? 'bg-red-500/90 dark:bg-red-600/90'
                  : 'bg-orange-500/90 dark:bg-orange-600/90'
              }`}>
                <svg className="w-3.5 h-3.5 text-white animate-[bell-ring_0.5s_ease-in-out_2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-[11px] font-bold text-white tracking-wide">
                  {isRed
                    ? (locale === 'zh' ? '突发' : 'BREAKING')
                    : (locale === 'zh' ? '重要' : 'IMPORTANT')}
                </span>
              </div>
              {item.source && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  {item.source}
                </span>
              )}
            </div>
            <button
              data-close
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <p className={`text-[15px] font-bold leading-relaxed mb-1.5 ${
            isRed ? 'text-red-900 dark:text-red-50' : 'text-orange-900 dark:text-orange-50'
          }`}>
            {item.title}
          </p>

          {/* Description */}
          {item.description && (
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 mb-3">
              {item.description}
            </p>
          )}

          {/* Footer: read more + category */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
              isRed ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
            }`}>
              {locale === 'zh' ? '查看詳情' : 'Read more'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            {item.category && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isRed
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'
                  : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300'
              }`}>
                {item.category}
              </span>
            )}
          </div>
        </div>

        {/* Bottom countdown progress bar */}
        <div className="h-[3px] bg-gray-200/50 dark:bg-gray-700/50">
          <div className={`h-full ${
            isRed
              ? 'bg-gradient-to-r from-red-400 to-red-500'
              : 'bg-gradient-to-r from-orange-400 to-amber-500'
          } animate-[toast-timer_10s_linear_forwards]`} />
        </div>
      </a>
    </div>
  );
}
