'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { HomepageCurationItem } from '@/lib/server/homepage-curation';

interface HomepageLeadCarouselProps {
  items: HomepageCurationItem[];
  locale: Locale;
  kicker: string;
}

function cleanExcerpt(text: string): string {
  if (!text) return '';
  return text
    .replace(/^来源[：:]\s*\S+[（(][^)）]*[)）]\s*/g, '')
    .replace(/^作者[：:]\s*\S+\s*/g, '')
    .replace(/^编者按[：:]\s*/g, '')
    .replace(/^文\s*[|/｜]\s*\S+\s*/g, '')
    .replace(/^原文标题[：:]\s*[^\n]+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatPublishedDate(dateStr: string, locale: Locale): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ROTATION_INTERVAL = 7000;

export default function HomepageLeadCarousel({
  items,
  locale,
  kicker,
}: HomepageLeadCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isZh = locale === 'zh';

  const startTimer = useCallback(() => {
    if (items.length <= 1) return;
    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress(0);
    // Progress update every 50ms
    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + (50 / ROTATION_INTERVAL) * 100, 100));
    }, 50);
    // Slide change
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
      setProgress(0);
    }, ROTATION_INTERVAL);
  }, [items.length]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  }, []);

  useEffect(() => {
    if (!isPaused) startTimer();
    else stopTimer();
    return stopTimer;
  }, [isPaused, startTimer, stopTimer]);

  // Reset progress when activeIndex changes manually
  const goTo = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
    if (!isPaused) {
      stopTimer();
      startTimer();
    }
  };

  const togglePause = () => setIsPaused((prev) => !prev);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
        <h2 className="text-xl font-bold">
          {isZh ? '首页头条轮播位已预留，等待编辑确认内容。' : 'Homepage lead rotation is ready for editorial curation.'}
        </h2>
      </div>
    );
  }

  const activeItem = items[activeIndex] || items[0];
  const excerpt = cleanExcerpt(activeItem.excerpt);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-[#101828] to-[#172554] text-white shadow-lg">
      {/* Top bar: kicker + category + pause control */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/70">
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5">{kicker}</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5">
            {activeItem.category || (isZh ? '分析' : 'Analysis')}
          </span>
        </div>
        <button
          type="button"
          onClick={togglePause}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-200/70 transition-colors hover:bg-white/10"
          title={isPaused ? (isZh ? '继续播放' : 'Resume') : (isZh ? '暂停轮播' : 'Pause')}
        >
          {isPaused ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" /><rect x="6" y="1" width="3" height="8" /></svg>
          )}
          {isPaused ? (isZh ? '播放' : 'Play') : (isZh ? '暂停' : 'Pause')}
        </button>
      </div>

      {/* Progress bars for each slide */}
      <div className="flex gap-1 px-5 sm:px-6">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10 transition-all hover:bg-white/20"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-400 transition-all"
              style={{
                width: index < activeIndex ? '100%' :
                       index === activeIndex ? `${progress}%` : '0%',
                transition: index === activeIndex ? 'width 50ms linear' : 'width 300ms ease',
              }}
            />
          </button>
        ))}
      </div>

      {/* Main content: compact layout */}
      <div className="px-5 pt-3 pb-4 sm:px-6">
        <Link href={`/${locale}/analysis/${activeItem.slug}`} className="block no-underline">
          <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white transition-opacity hover:opacity-90 sm:text-2xl">
            {activeItem.title}
          </h2>
        </Link>

        {excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
            {excerpt}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-blue-200/70">
          <span>{activeItem.author || (isZh ? 'HashSpring 编辑部' : 'HashSpring Desk')}</span>
          <span className="text-white/20">·</span>
          <span>{formatPublishedDate(activeItem.published_at, locale)}</span>
          {activeItem.read_time > 0 && (
            <>
              <span className="text-white/20">·</span>
              <span>{activeItem.read_time} {isZh ? '分钟' : 'min'}</span>
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/analysis/${activeItem.slug}`}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 no-underline transition-transform hover:-translate-y-0.5"
          >
            {isZh ? '阅读全文' : 'Read more'}
          </Link>
          <Link
            href={`/${locale}/analysis`}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white no-underline transition-colors hover:bg-white/10"
          >
            {isZh ? '更多分析' : 'All analysis'}
          </Link>
        </div>
      </div>

      {/* Bottom: compact slide selector */}
      <div className="border-t border-white/8 px-5 py-3 sm:px-6">
        <div className="grid grid-cols-5 gap-2">
          {items.map((item, index) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => goTo(index)}
              className={`rounded-lg px-2 py-1.5 text-left transition-all ${
                index === activeIndex
                  ? 'bg-white/12 border border-white/20'
                  : 'bg-transparent border border-transparent hover:bg-white/6'
              }`}
            >
              <span className={`block text-[10px] font-bold tabular-nums ${
                index === activeIndex ? 'text-blue-300' : 'text-white/40'
              }`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={`mt-0.5 block truncate text-[11px] leading-tight ${
                index === activeIndex ? 'text-white' : 'text-white/50'
              }`}>
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
