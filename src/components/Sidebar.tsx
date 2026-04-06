'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MarketWidget } from './MarketWidget';
import { MarketHeatmap } from './MarketHeatmap';
import { MarketIndicators } from './MarketIndicators';
import { EventCalendar } from './EventCalendar';
import { LBankAd300x250, LBankAd300x250Alt } from './LBankAd';
import FearGreedGauge from './FearGreedGauge';
import DefiTVLWidget from './DefiTVLWidget';
import CoinGeckoTrending from './CoinGeckoTrending';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function Sidebar({ dict, locale = 'en' }: { dict: Dictionary; locale?: Locale }) {
  return (
    <aside className="flex flex-col gap-6">
      {/* Ad 300x250 — LBank x Argentina #1 */}
      <LBankAd300x250 label={dict.adLabel} locale={locale} />

      {/* Fear & Greed Index */}
      <FearGreedGauge locale={locale} />

      {/* Market Widget — 实时币价 */}
      <MarketWidget dict={dict} />

      {/* Key Indicators — 行业关键指标 (参照 PANews) */}
      <MarketIndicators locale={locale as Locale} />

      {/* DeFi TVL */}
      <DefiTVLWidget locale={locale} />

      {/* Market Heatmap */}
      <MarketHeatmap locale={locale} />

      {/* CoinGecko Trending Searches */}
      <CoinGeckoTrending locale={locale} />

      {/* Event Calendar — 事件日历 (参照 PANews) */}
      <EventCalendar locale={locale as Locale} />

      {/* Newsletter */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5"><h3 className="text-base font-bold mb-1">{dict.sectionNewsletter}</h3><p className="text-sm text-gray-500 leading-relaxed mb-4">{dict.newsletterDesc}</p><input placeholder={dict.emailPh} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm mb-2 outline-none focus:border-blue-500" /><button className="w-full px-4 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD]">{dict.subscribeCta}</button></div>

      {/* Trending */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-bold mb-3">{dict.sectionTrending}</h3>
        <div className="flex flex-wrap gap-2">
          {dict.trending.map((tag) => (
            <Link key={tag} href={`/${locale}/flashnews?q=${encodeURIComponent(tag)}`} prefetch={false} className="text-xs font-medium text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Ad 300x250 #2 — LBank x Argentina (alt promo) */}
      <LBankAd300x250Alt label={dict.adLabel} locale={locale} />
    </aside>
  );
}
