'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function HomepageLeadCarousel({
  items,
  locale,
  kicker,
}: HomepageLeadCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isZh = locale === 'zh';

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-[30px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_32%),linear-gradient(135deg,_#0f172a_0%,_#111827_56%,_#1d4ed8_100%)] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <h2 className="text-4xl font-black tracking-[-0.04em]">
          {isZh ? '首页头条轮播位已预留，等待编辑确认内容。' : 'Homepage lead rotation is ready for editorial curation.'}
        </h2>
      </div>
    );
  }

  const activeItem = items[activeIndex] || items[0];

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(135deg,_#0f172a_0%,_#101828_72%,_#172554_100%)] text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100/80">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{kicker}</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            {activeItem.category || (isZh ? '分析' : 'Analysis')}
          </span>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1">
            {isZh ? `轮播 ${activeIndex + 1}/5` : `Rotation ${activeIndex + 1}/5`}
          </span>
        </div>

        <Link href={`/${locale}/analysis/${activeItem.slug}`} className="mt-4 block no-underline">
          <h2 className="max-w-[11.2ch] text-[2.1rem] font-black leading-[0.96] tracking-[-0.06em] text-white transition-opacity hover:opacity-90 sm:text-[3.75rem]">
            {activeItem.title}
          </h2>
        </Link>

        <p className="mt-4 max-w-[72ch] text-[15px] leading-7 text-slate-200">
          {cleanExcerpt(activeItem.excerpt)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-100/80">
          <span>{activeItem.author || (isZh ? 'HashSpring 编辑部' : 'HashSpring Desk')}</span>
          <span>{formatPublishedDate(activeItem.published_at, locale)}</span>
          {activeItem.read_time > 0 && <span>{activeItem.read_time} {isZh ? '分钟阅读' : 'min read'}</span>}
          {activeItem.views > 0 && <span>{activeItem.views.toLocaleString()} {isZh ? '阅读' : 'views'}</span>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/analysis/${activeItem.slug}`}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 no-underline transition-transform hover:-translate-y-0.5"
          >
            {isZh ? '阅读头条' : 'Read lead'}
          </Link>
          <Link
            href={`/${locale}/analysis`}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-white/10"
          >
            {isZh ? '进入分析频道' : 'Open analysis desk'}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {items.map((item, index) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group rounded-full border px-3 py-2 text-left transition-all ${
                index === activeIndex
                  ? 'border-white/30 bg-white/12'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/70">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mt-1 block max-w-[150px] truncate text-xs text-slate-100">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
