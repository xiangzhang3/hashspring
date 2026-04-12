'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Locale } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';
import { FlashFeed, isAnalysisItem } from '@/components/FlashFeed';

// ── Extracted sub-components ──
import { ALL_CATEGORIES, CATEGORY_ZH, filterDigestOnlyExchanges, playNotificationSound, sendDesktopNotification } from '@/components/flash/FlashFeedUtils';
import FlashFeedSkeleton from '@/components/flash/FlashFeedSkeleton';
import { LiveClock, RadarPulse } from '@/components/flash/FlashFeedStatusBar';
import BreakingToast from '@/components/flash/BreakingToast';
import FlashFeedAnimations from '@/components/flash/FlashFeedAnimations';

interface LiveFlashFeedProps {
  initialItems: FlashItem[];
  locale: Locale;
  adLabel: string;
  categories?: string[];
}

export default function LiveFlashFeed({
  initialItems,
  locale,
  adLabel,
  categories,
}: LiveFlashFeedProps) {
  const [items, setItems] = useState<FlashItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(initialItems.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [toastItem, setToastItem] = useState<FlashItem | null>(null);
  const [countdown, setCountdown] = useState(30);
  const feedRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 30;

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  }, []);

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Analysis') return isAnalysisItem(item);
    return item.category === activeCategory;
  });

  // ─── Refresh latest news (top polling) ───
  const refreshNews = useCallback(async () => {
    if (isPaused) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/flash-news?locale=${locale}&limit=${PAGE_SIZE}`);

      if (!response.ok) {
        console.warn('Failed to refresh news:', response.status);
        return;
      }

      const rawItems: FlashItem[] = await response.json();
      const newItems = filterDigestOnlyExchanges(rawItems);

      if (Array.isArray(newItems) && newItems.length > 0) {
        // First load (empty initial) — just set items directly
        if (items.length === 0) {
          setItems(newItems);
          setHasMore(newItems.length >= PAGE_SIZE);
          setLastRefresh(new Date());
        } else {
          // Merge: new items in front, keep old ones (dedup by title)
          const existingTitles = new Set(items.map(item => item.title));
          const actuallyNewItems = newItems.filter(
            item => !existingTitles.has(item.title)
          );

          if (actuallyNewItems.length > 0) {
            setNewCount(actuallyNewItems.length);
            setNewItemIds(new Set(actuallyNewItems.map(i => i.id)));
            const mergedTitles = new Set<string>();
            const merged: FlashItem[] = [];
            for (const item of [...newItems, ...items]) {
              if (!mergedTitles.has(item.title)) {
                mergedTitles.add(item.title);
                merged.push(item);
              }
            }
            setItems(merged);
            setLastRefresh(new Date());

            if (soundEnabled) {
              const hasBreaking = actuallyNewItems.some((i) => i.level === 'red');
              const hasImportant = actuallyNewItems.some((i) => i.level === 'orange');
              playNotificationSound(hasBreaking ? 'red' : hasImportant ? 'orange' : 'blue');
            }

            const breakingItem = actuallyNewItems.find((i) => i.level === 'red' || i.level === 'orange');
            if (breakingItem) {
              setToastItem(breakingItem);
              sendDesktopNotification(
                locale === 'zh' ? 'HashSpring 快訊' : 'HashSpring Flash',
                breakingItem.title
              );
            }

            setTimeout(() => setNewItemIds(new Set()), 3000);
            setTimeout(() => setNewCount(0), 8000);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [items, locale, isPaused, soundEnabled]);

  // ─── Load more older news (pagination) ───
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const offset = items.length;
      const response = await fetch(`/api/flash-news?locale=${locale}&limit=${PAGE_SIZE}&offset=${offset}`);

      if (!response.ok) {
        console.warn('Failed to load more:', response.status);
        return;
      }

      const rawOlder: FlashItem[] = await response.json();
      const olderItems = filterDigestOnlyExchanges(rawOlder);

      if (Array.isArray(olderItems) && olderItems.length > 0) {
        const existingTitles = new Set(items.map(item => item.title));
        const uniqueOlder = olderItems.filter(item => !existingTitles.has(item.title));
        if (uniqueOlder.length > 0) {
          setItems(prev => [...prev, ...uniqueOlder]);
        }
        if (olderItems.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [items, locale, isLoadingMore, hasMore]);

  // Immediately fetch real data on mount (no delay, no mock data)
  const hasFetchedOnMount = useRef(false);
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      refreshNews();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds + countdown
  useEffect(() => {
    setCountdown(30);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshNews();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [refreshNews]);

  // ─── IntersectionObserver for auto-loading more ───
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const categoryOptions = categories && categories.length > 0 ? categories : ALL_CATEGORIES;

  // Format last refresh as local time
  const lastRefreshTime = lastRefresh.toLocaleTimeString(
    locale === 'zh' ? 'zh-TW' : 'en-US',
    { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  );

  return (
    <div ref={feedRef}>
      <FlashFeedAnimations />

      {/* ═══ Telegraph Live Status Bar ═══ */}
      <div className="flex items-center justify-between mb-4 py-3 px-4 rounded-lg bg-gray-50 dark:bg-[#0F1119] border border-gray-100 dark:border-[#1C1F2E]">
        <div className="flex items-center gap-3">
          <RadarPulse />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {locale === 'zh' ? '快訊持續更新中' : 'Live Telegraph'}
          </span>
          {newCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-bounce">
              +{newCount}
            </span>
          )}
          {!isPaused && newCount === 0 && (
            <span className="text-[10px] text-gray-400 tabular-nums">
              {locale === 'zh' ? `${countdown}s 後刷新` : `Auto refresh in ${countdown}s`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title={soundEnabled
              ? (locale === 'zh' ? '關閉音效' : 'Mute')
              : (locale === 'zh' ? '開啟音效' : 'Unmute')}
          >
            {soundEnabled ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.788V15.212c0 .523.403.957.923.983l.078.003H10l4.586 4.586A.5.5 0 0015.5 20.49V3.51a.5.5 0 00-.914-.293L10 8H7.5a1 1 0 00-1 .788z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
          {/* Notification toggle */}
          <button
            onClick={requestNotifPermission}
            className={`text-xs transition-colors ${
              notifPermission === 'granted'
                ? 'text-green-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={notifPermission === 'granted'
              ? (locale === 'zh' ? '通知已開啟' : 'Notifications on')
              : (locale === 'zh' ? '開啟桌面通知' : 'Enable notifications')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
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
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 dark:bg-[#1C1F2E] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#262C3E]'
              }`}
            >
              {locale === 'zh' ? (CATEGORY_ZH[category] || category) : category}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Flash feed timeline with animations ═══ */}
      {isLoading && filteredItems.length === 0 ? (
        <FlashFeedSkeleton />
      ) : (
        <>
          {filteredItems.length > 0 ? (
            <div>
              {filteredItems.map((item, i) => {
                const isNew = newItemIds.has(item.id);
                const isNewRed = isNew && item.level === 'red';
                return (
                  <div
                    key={item.id}
                    className={isNewRed ? 'flash-item-new-red' : isNew ? 'flash-item-new' : ''}
                  >
                    <FlashFeed
                      items={[item]}
                      locale={locale}
                      adLabel={i === 4 ? adLabel : ''}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {locale === 'zh' ? '暫無新聞' : 'No news available'}
              </p>
            </div>
          )}

          {/* Auto-load more trigger + manual button */}
          <div ref={loadMoreRef} className="mt-2">
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4 gap-2">
                <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-400">
                  {locale === 'zh' ? '載入更多快訊...' : 'Loading more...'}
                </span>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 rounded-lg border border-gray-200 dark:border-[#1C1F2E] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#0F1119] transition-colors"
              >
                {locale === 'zh' ? '載入更多' : 'Load More'}
              </button>
            )}
            {!hasMore && filteredItems.length > 0 && (
              <p className="text-center py-4 text-xs text-gray-400">
                {locale === 'zh' ? '已載入全部快訊' : 'All news loaded'}
              </p>
            )}
          </div>

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

      {/* ═══ Breaking news toast popup ═══ */}
      {toastItem && (
        <BreakingToast
          item={toastItem}
          locale={locale}
          onClose={() => setToastItem(null)}
        />
      )}
    </div>
  );
}
