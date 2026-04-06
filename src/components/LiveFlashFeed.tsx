'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Locale } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';
import { FlashFeed, isAnalysisItem } from '@/components/FlashFeed';

const ALL_CATEGORIES = ['All', 'Analysis', 'BTC', 'ETH', 'DeFi', 'NFT', 'L2', 'Policy', 'SOL', 'Stable', 'AI', 'Exchange'];
const CATEGORY_ZH: Record<string, string> = {
  All: '全部', Analysis: '分析', Policy: '政策', Exchange: '交易所', Stable: '穩定幣',
};

// ─── Client-side safety filter: hide individual exchange items (belt-and-suspenders) ───
const DIGEST_ONLY_EXCHANGES_CLIENT = new Set([
  'Bitget', 'LBank', 'KuCoin', 'MEXC', 'Gate.io', 'HTX',
  'Coinbase', 'Bybit', 'Upbit', 'Bithumb', 'Hyperliquid', 'Aster',
]);
const IS_DIGEST_TITLE_CLIENT = /daily\s*digest|每日[匯汇]總|每日摘要/i;
const EXCHANGE_TITLE_RE = /kucoin|bitget|lbank|gate\.io|htx|huobi|bybit|upbit|bithumb|hyperliquid|aster/i;
const LISTING_KEYWORD_RE = /上[市线線]|登[陆陸]|首[发發]|listing|delist|将上线|已上线|新增|兑换|convert|perpetual|合约|期货/i;

function filterDigestOnlyExchanges(items: FlashItem[]): FlashItem[] {
  return items.filter(item => {
    const title = item.title || '';
    if (IS_DIGEST_TITLE_CLIENT.test(title)) return true;
    if (item.source && DIGEST_ONLY_EXCHANGES_CLIENT.has(item.source)) return false;
    if (EXCHANGE_TITLE_RE.test(title) && LISTING_KEYWORD_RE.test(title)) return false;
    return true;
  });
}

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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (level === 'orange') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
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
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-0">
          <div className="w-[56px] flex-shrink-0 pr-3 pt-[18px] text-right">
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-8 ml-auto" />
          </div>
          <div className="w-6 flex flex-col items-center flex-shrink-0">
            <div className="mt-[20px] w-[10px] h-[10px] bg-gray-200 dark:bg-[#1C1F2E] rounded-full" />
            <div className="w-px flex-1 bg-gray-100 dark:bg-[#1C1F2E]" />
          </div>
          <div className="flex-1 my-1.5 mx-1 p-3.5 rounded-xl border border-gray-100 dark:border-[#1e293b] bg-white dark:bg-[#111827]">
            <div className="flex gap-2 mb-2">
              <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-12" />
              <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-16" />
            </div>
            <div className="h-5 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full mb-1.5" />
            <div className="h-5 bg-gray-200 dark:bg-[#1C1F2E] rounded w-4/5 mb-1.5" />
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Live clock that ticks every second, showing date + local time */
function LiveClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const y = d.getFullYear();
      const mon = d.getMonth() + 1;
      const day = d.getDate();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      const dateStr = locale === 'zh'
        ? `${y}年${mon}月${day}日`
        : `${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      setNow(`${dateStr} ${h}:${m}:${s}`);
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

// ─── 雷达扫描动画组件 ───
function RadarPulse() {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      {/* 最外层扩散圈 - 慢 */}
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20 animate-[radar-ping_3s_ease-out_infinite]" />
      {/* 中层扩散圈 - 中 */}
      <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-30 animate-[radar-ping_3s_ease-out_1s_infinite]" />
      {/* 内层扩散圈 - 快 */}
      <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-40 animate-[radar-ping_3s_ease-out_2s_infinite]" />
      {/* 核心亮点 */}
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8),0_0_16px_rgba(239,68,68,0.4)]" />
      {/* 扫描线 */}
      <span className="absolute w-full h-full animate-[radar-sweep_2s_linear_infinite]" style={{
        background: 'conic-gradient(from 0deg, transparent 0%, transparent 85%, rgba(239,68,68,0.6) 95%, transparent 100%)',
        borderRadius: '50%',
      }} />
    </span>
  );
}

// ─── 右下角重点推送弹窗（可点击跳转详情） ───
function BreakingToast({ item, locale, onClose }: { item: FlashItem; locale: Locale; onClose: () => void }) {
  const isRed = item.level === 'red';
  const detailUrl = `/${locale}/flash/${encodeURIComponent(item.id)}`;

  useEffect(() => {
    const timer = setTimeout(onClose, 10000); // 10秒后自动关闭
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
        {/* 顶部渐变条 */}
        <div className={`h-1 ${
          isRed
            ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600'
            : 'bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500'
        } animate-[flash-bar_1.5s_ease-in-out_2]`} />

        <div className="p-4">
          {/* 头部：标签 + 来源 + 时间 + 关闭 */}
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

          {/* 标题 */}
          <p className={`text-[15px] font-bold leading-relaxed mb-1.5 ${
            isRed ? 'text-red-900 dark:text-red-50' : 'text-orange-900 dark:text-orange-50'
          }`}>
            {item.title}
          </p>

          {/* 描述 */}
          {item.description && (
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 mb-3">
              {item.description}
            </p>
          )}

          {/* 底部：查看详情 + 分类 */}
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

        {/* 底部倒计时进度条 */}
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

// ─── CSS 动画注入 ───
function AnimationStyles() {
  return (
    <style jsx global>{`
      /* 雷达扩散 */
      @keyframes radar-ping {
        0% { transform: scale(1); opacity: 0.5; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      /* 雷达扫描线 */
      @keyframes radar-sweep {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      /* 新快讯弹入 */
      @keyframes flash-slide-in {
        0% {
          opacity: 0;
          transform: translateY(-30px) scale(0.97);
          max-height: 0;
        }
        30% {
          opacity: 0.5;
          max-height: 200px;
        }
        60% {
          transform: translateY(3px) scale(1.01);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          max-height: 200px;
        }
      }
      /* 新快讯高亮闪烁 */
      @keyframes flash-highlight {
        0% { background-color: rgba(59,130,246,0.15); }
        50% { background-color: rgba(59,130,246,0.08); }
        100% { background-color: transparent; }
      }
      /* 突发新闻高亮 */
      @keyframes flash-highlight-red {
        0% { background-color: rgba(239,68,68,0.2); }
        50% { background-color: rgba(239,68,68,0.1); }
        100% { background-color: transparent; }
      }
      /* 推送弹窗入场 */
      @keyframes toast-in {
        0% {
          opacity: 0;
          transform: translateX(100%) translateY(20px) scale(0.9);
        }
        50% {
          transform: translateX(-5%) translateY(0) scale(1.02);
        }
        100% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(1);
        }
      }
      /* 推送弹窗倒计时 */
      @keyframes toast-timer {
        0% { width: 100%; }
        100% { width: 0%; }
      }
      /* 顶部闪烁条 */
      @keyframes flash-bar {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      /* 铃铛摇晃 */
      @keyframes bell-ring {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-15deg); }
        60% { transform: rotate(10deg); }
        80% { transform: rotate(-10deg); }
      }
      /* 新项目入场动画类 */
      .flash-item-new {
        animation: flash-slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flash-highlight 2s ease-out 0.6s forwards;
      }
      .flash-item-new-red {
        animation: flash-slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                   flash-highlight-red 3s ease-out 0.6s forwards;
      }
      /* 旧项目下推动画 */
      .flash-item-push-down {
        animation: flash-push-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes flash-push-down {
        0% { transform: translateY(-20px); opacity: 0.7; }
        100% { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );
}


function getDayKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
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

  // ─── 刷新最新快讯（顶部轮询，获取新闻） ───
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
          // 合并：新的放前面，旧的保留（按 title 去重）
          const existingTitles = new Set(items.map(item => item.title));
          const actuallyNewItems = newItems.filter(
            item => !existingTitles.has(item.title)
          );

          if (actuallyNewItems.length > 0) {
            setNewCount(actuallyNewItems.length);
            setNewItemIds(new Set(actuallyNewItems.map(i => i.id)));
            // 把新条目插入到前面，保留已加载的旧条目
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

  // ─── 加载更多旧快讯（向下翻页） ───
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
        // 去重后追加到末尾
        const existingTitles = new Set(items.map(item => item.title));
        const uniqueOlder = olderItems.filter(item => !existingTitles.has(item.title));
        if (uniqueOlder.length > 0) {
          setItems(prev => [...prev, ...uniqueOlder]);
        }
        // 如果返回的条数少于请求的，说明没有更多了
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

  // ─── IntersectionObserver 自动加载更多 ───
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' } // 提前200px触发
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
      <AnimationStyles />

      {/* ═══ Telegraph Live Status Bar ═══ */}
      <div className="flex items-center justify-between mb-4 py-3 px-4 rounded-lg bg-gray-50 dark:bg-[#0F1119] border border-gray-100 dark:border-[#1C1F2E]">
        <div className="flex items-center gap-3">
          {/* 雷达扫描动画 */}
          <RadarPulse />
          {/* Live text */}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {locale === 'zh' ? '快訊持續更新中' : 'Live Telegraph'}
          </span>
          {/* New items badge */}
          {newCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-bounce">
              +{newCount}
            </span>
          )}
          {/* 自动刷新倒计时 */}
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
              key={locale === 'zh' ? (CATEGORY_ZH[category] || category) : category}
              onClick={() => {
                setActiveCategory(category);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
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
        <Skeleton />
      ) : (
        <>
          {filteredItems.length > 0 ? (
            <div>
              {filteredItems.map((item, i) => {
                const isNew = newItemIds.has(item.id);
                const isNewRed = isNew && item.level === 'red';
                const prevItem = i > 0 ? filteredItems[i - 1] : null;
                const curDay = getDayKey(item.published_at);
                const prevDay = prevItem ? getDayKey(prevItem.published_at) : '';
                return (
                  <div key={item.id}>
                    <div className={isNewRed ? 'flash-item-new-red' : isNew ? 'flash-item-new' : ''}>
                      <FlashFeed
                        items={[item]}
                        locale={locale}
                        adLabel={i === 4 ? adLabel : ''}
                      />
                    </div>
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

          {/* 自动加载更多触发点 + 手动按钮 */}
          <div ref={loadMoreRef} className="mt-2">
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4 gap-2">
                <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-gray-400">
                  {locale === 'zh' ? `正在載入更多快訊...（已有 ${filteredItems.length} 條）` : `Loading more... (${filteredItems.length} loaded)`}
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

      {/* ═══ 右下角重点推送弹窗 ═══ */}
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
