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

// ─── Sound notification using Web Audio API ───
function playNotificationSound(level: 'red' | 'orange' | 'blue' = 'blue') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (level === 'red') {
      // Breaking news: two-tone alert
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (level === 'orange') {
      // Important news: medium tone
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Normal news: soft ping
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Web Audio not available
  }
}

// ─── Desktop notification for breaking news ───
function sendDesktopNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'hashspring-flash',
      requireInteraction: false,
    });
  }
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const feedRef = useRef<HTMLDivElement>(null);

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

          // Sound alert based on highest priority new item
          if (soundEnabled) {
            const hasBreaking = actuallyNewItems.some((i) => i.level === 'red');
            const hasImportant = actuallyNewItems.some((i) => i.level === 'orange');
            playNotificationSound(hasBreaking ? 'red' : hasImportant ? 'orange' : 'blue');
          }

          // Desktop notification for breaking/important news
          const breakingItem = actuallyNewItems.find((i) => i.level === 'red' || i.level === 'orange');
          if (breakingItem) {
            sendDesktopNotification(
              locale === 'zh' ? 'HashSpring 快讯' : 'HashSpring Flash',
              breakingItem.title
            );
          }

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

  // Immediately fetch real data on mount (replaces mock data from SSR)
  const hasFetchedOnMount = useRef(false);
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      // Small delay to avoid blocking initial render
      const timer = setTimeout(() => {
        refreshNews();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds (参照财联社实时快讯频率)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshNews();
    }, 30 * 1000);

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
