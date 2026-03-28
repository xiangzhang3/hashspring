'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Locale } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';
import { FlashFeed } from '@/components/FlashFeed';

const ALL_CATEGORIES = ['All', 'BTC', 'ETH', 'DeFi', 'NFT', 'L2', 'Policy', 'SOL', 'Stable', 'AI', 'Exchange'];

interface LiveFlashFeedProps {
  initialItems: FlashItem[];
  locale: Locale;
  adLabel: string;
  categories?: string[];
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3.5 py-4 border-b border-gray-200 dark:border-[#1C1F2E]">
          <div className="w-14 flex-shrink-0">
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full" />
          </div>
          <div className="pt-[7px] flex-shrink-0">
            <div className="w-2 h-2 bg-gray-200 dark:bg-[#1C1F2E] rounded-full" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-16" />
            <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Live clock that ticks every second, showing local time */
function LiveClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      setNow(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums font-mono text-sm text-gray-500 dark:text-gray-400">
      {now}
    </span>
  );
}

export default function LiveFlashFeed({
  initialItems,
  locale,
  adLabel,
  categories,
}: LiveFlashFeedProps) {
  const [items, setItems] = useState<FlashItem[]>(initialItems);
  const [displayedCount, setDisplayedCount] = useState(20);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category === activeCategory;
  });

  const displayedItems = filteredItems.slice(0, displayedCount);

  const refreshNews = useCallback(async () => {
    if (isPaused) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/flash-news?locale=${locale}`);

      if (!response.ok) {
        console.warn('Failed to refresh news:', response.status);
        return;
      }

      const newItems: FlashItem[] = await response.json();

      if (Array.isArray(newItems) && newItems.length > 0) {
        const oldItemIds = new Set(items.map(item => item.title));
        const actuallyNewItems = newItems.filter(
          item => !oldItemIds.has(item.title)
        );

        if (actuallyNewItems.length > 0) {
          setNewCount(actuallyNewItems.length);
          setItems(newItems);
          setLastRefresh(new Date());

          // Auto-dismiss new count badge after 8 seconds
          setTimeout(() => setNewCount(0), 8000);
        }
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [items, locale, isPaused]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshNews();
    }, 2 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [refreshNews]);

  const categoryOptions = categories && categories.length > 0 ? categories : ALL_CATEGORIES;

  // Format last refresh as local time
  const lastRefreshTime = lastRefresh.toLocaleTimeString(
    locale === 'zh' ? 'zh-TW' : 'en-US',
    { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  );

  return (
    <div ref={feedRef}>
      {/* ═══ Telegraph Live Status Bar ═══ */}
      <div className="flex items-center justify-between mb-4 py-3 px-4 rounded-lg bg-gray-50 dark:bg-[#0F1119] border border-gray-100 dark:border-[#1C1F2E]">
        <div className="flex items-center gap-3">
          {/* Pulsing live dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          {/* Live text */}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {locale === 'zh' ? '快訊持續更新中' : 'Live Telegraph'}
          </span>
          {/* New items badge */}
          {newCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
              +{newCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Pause/Resume toggle */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title={isPaused ? (locale === 'zh' ? '繼續更新' : 'Resume') : (locale === 'zh' ? '暫停更新' : 'Pause')}
          >
            {isPaused ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          {/* Manual refresh */}
          <button
            onClick={refreshNews}
            disabled={isLoading}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            title={locale === 'zh' ? '手動刷新' : 'Refresh'}
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {/* Live clock */}
          <LiveClock locale={locale} />
        </div>
      </div>

      {/* ═══ Paused overlay ═══ */}
      {isPaused && (
        <div className="mb-3 py-2 px-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 text-center">
          <span className="text-xs text-yellow-700 dark:text-yellow-300">
            {locale === 'zh' ? '已暫停自動更新' : 'Auto-update paused'}{' '}
            <button onClick={() => setIsPaused(false)} className="underline font-medium">
              {locale === 'zh' ? '繼續' : 'Resume'}
            </button>
          </span>
        </div>
      )}

      {/* ═══ Category filter bar ═══ */}
      <div className="mb-5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
        <div className="flex gap-2 flex-nowrap sm:flex-wrap">
          {categoryOptions.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setDisplayedCount(20);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 dark:bg-[#1C1F2E] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#262C3E]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Flash feed timeline ═══ */}
      {isLoading && displayedItems.length === 0 ? (
        <Skeleton />
      ) : (
        <>
          {displayedItems.length > 0 ? (
            <FlashFeed items={displayedItems} locale={locale} adLabel={adLabel} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {locale === 'zh' ? '暫無新聞' : 'No news available'}
              </p>
            </div>
          )}

          {/* Load more button */}
          {filteredItems.length > displayedCount && (
            <button
              onClick={() => setDisplayedCount(prev => prev + 20)}
              disabled={isLoading}
              className="w-full mt-4 py-3 rounded-lg border border-gray-200 dark:border-[#1C1F2E] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0F1119] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? locale === 'zh'
                  ? '載入中...'
                  : 'Loading...'
                : locale === 'zh'
                  ? '載入更多'
                  : 'Load More'}
            </button>
          )}

          {/* ═══ Footer status ═══ */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-ping'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`} />
            </span>
            <span>
              {locale === 'zh'
                ? `${isPaused ? '已暫停' : '自動更新中'} · 上次更新 ${lastRefreshTime}`
                : `${isPaused ? 'Paused' : 'Auto-updating'} · Last update ${lastRefreshTime}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
