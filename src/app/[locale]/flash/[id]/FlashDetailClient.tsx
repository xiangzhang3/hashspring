'use client';

import { useState, useEffect } from 'react';
import type { Locale, Dictionary } from '@/lib/i18n';
import type { FlashItem } from '@/components/FlashFeed';
import { FlashFeed } from '@/components/FlashFeed';
import { LogoBadge } from '@/components/Logo';
import { LBankAd300x250 } from '@/components/LBankAd';
import { MarketWidget } from '@/components/MarketWidget';
import Link from 'next/link';

interface Props {
  locale: Locale;
  articleId: string;
  dict: Dictionary;
}

function findArticleById(items: FlashItem[], id: string) {
  const decodedId = decodeURIComponent(id);
  const idx = items.findIndex(item => item.id === decodedId);
  if (idx !== -1) {
    return {
      article: items[idx],
      prevArticle: idx > 0 ? items[idx - 1] : null,
      nextArticle: idx < items.length - 1 ? items[idx + 1] : null,
      related: items.filter((_, i) => i !== idx).slice(0, 5),
    };
  }
  return { article: null, prevArticle: null, nextArticle: null, related: items.slice(0, 5) };
}

export default function FlashDetailClient({ locale, articleId, dict }: Props) {
  const isEn = locale === 'en';
  const [article, setArticle] = useState<FlashItem | null>(null);
  const [prevArticle, setPrevArticle] = useState<FlashItem | null>(null);
  const [nextArticle, setNextArticle] = useState<FlashItem | null>(null);
  const [related, setRelated] = useState<FlashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/flash-news?locale=${locale}`);
        if (res.ok) {
          const items: FlashItem[] = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const result = findArticleById(items, articleId);
            if (result.article) {
              setArticle(result.article);
              setPrevArticle(result.prevArticle);
              setNextArticle(result.nextArticle);
              setRelated(result.related);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch article:', e);
      }
      setError(true);
      setLoading(false);
    }
    fetchData();
  }, [locale, articleId]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mt-8" />
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !article) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{isEn ? 'Article Not Found' : '文章未找到'}</h1>
        <p className="text-gray-500 mb-6">
          {isEn
            ? 'This flash news item may have expired or the link is invalid.'
            : '该快讯可能已过期或链接无效。'}
        </p>
        <Link href={`/${locale}/flashnews`} className="text-blue-500 hover:underline">
          {isEn ? 'View All Flash News →' : '查看全部快讯 →'}
        </Link>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: new Date().toISOString(),
    author: { '@type': 'Organization', name: article.source || 'HashSpring' },
    publisher: { '@type': 'Organization', name: 'HashSpring', url: 'https://hashspring.com' },
    description: article.title,
    mainEntityOfPage: `https://hashspring.com/${locale}/flash/${articleId}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-5 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href={`/${locale}`} className="text-gray-400 no-underline hover:text-gray-600">{dict.home}</Link>
          <span>/</span>
          <Link href={`/${locale}/flashnews`} className="text-[#0066FF] no-underline">{dict.flash}</Link>
          <span>/</span>
          <span className="text-gray-500">{article.category}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10">

        {/* LEFT: Article */}
        <article>
          {/* Badge + Category + Time */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`text-white text-[11px] font-extrabold px-3 py-1 rounded ${
              article.level === 'red' ? 'bg-red-500' : article.level === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
              {article.level === 'red'
                ? (isEn ? 'BREAKING' : '突发')
                : article.level === 'orange'
                  ? (isEn ? 'IMPORTANT' : '重要')
                  : (isEn ? 'UPDATE' : '动态')}
            </span>
            <span className="text-sm text-gray-500 font-medium">{article.category}</span>
            <span className="text-sm text-gray-400">{article.time}</span>
            {article.source && (
              <span className="text-sm text-gray-400">
                {isEn ? 'Source: ' : '来源：'}{article.source}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug tracking-tight mb-6 max-w-[660px]">
            {article.title}
          </h1>

          {/* Author + Share row */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <LogoBadge size={36} />
              <div>
                <div className="text-sm font-bold">{article.source || 'HashSpring'}</div>
                <div className="text-xs text-gray-400">{article.time}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 mr-1">{dict.share}:</span>
              {['X', 'Telegram', 'Reddit'].map((btn) => (
                <button
                  key={btn}
                  className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Article body */}
          <div className="max-w-[660px] mb-8">
            {/* "据 hashspring.com" attribution */}
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              <span>{isEn ? 'According to hashspring.com' : '据 hashspring.com 报道'}</span>
            </div>

            <div className="bg-gray-50 dark:bg-[#0F1119] border border-gray-200 dark:border-[#1C1F2E] rounded-lg p-6 mb-6">
              <p className="text-[15px] leading-[1.9] text-gray-700 dark:text-gray-300">
                {article.title}
              </p>
            </div>

            {/* Internal anchor links */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Link href={`/${locale}/category/${article.category.toLowerCase()}`} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? `More ${article.category} News` : `更多${article.category}资讯`} →
              </Link>
              <Link href={`/${locale}/flashnews`} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? 'All Flash News' : '全部快讯'} →
              </Link>
              <Link href={`/${locale}/market`} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? 'Live Market Data' : '实时行情'} →
              </Link>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {isEn
                ? 'This is a flash news update aggregated and curated by HashSpring. For the full article and more details, please visit the original source below.'
                : '本条快讯由 HashSpring 聚合并编辑发布。如需查看完整报道和更多详情，请点击下方原文链接。'}
            </p>
          </div>

          {/* ═══ Read Original Source ═══ */}
          {article.link && (
            <div className="max-w-[660px] mb-8 p-5 rounded-lg border-2 border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {isEn ? 'Read Original Report' : '阅读原文报道'}
                </span>
              </div>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline break-all"
              >
                {article.link}
              </a>
              {article.source && (
                <p className="text-xs text-gray-500 mt-2">
                  {isEn ? `Published by ${article.source}` : `发布于 ${article.source}`}
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8 max-w-[660px]">
            {[article.category, 'Crypto', isEn ? 'Breaking' : '快讯'].map((tag) => (
              <Link
                key={tag}
                href={`/${locale}/flashnews?q=${encodeURIComponent(tag)}`}
                className="text-xs font-medium text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6 mb-8">
            {prevArticle ? (
              <Link
                href={`/${locale}/flash/${encodeURIComponent(prevArticle.id)}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-[11px] font-semibold text-gray-400 mb-2">← {dict.prevLabel}</div>
                <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">{prevArticle.title}</div>
              </Link>
            ) : <div />}
            {nextArticle ? (
              <Link
                href={`/${locale}/flash/${encodeURIComponent(nextArticle.id)}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-[11px] font-semibold text-gray-400 mb-2">{dict.nextLabel} →</div>
                <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">{nextArticle.title}</div>
              </Link>
            ) : <div />}
          </div>

          {/* Related FlashNews */}
          {related.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-800 dark:border-gray-200">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-lg font-extrabold tracking-tight">
                  {isEn ? 'Related FlashNews' : '相关快讯'}
                </h2>
              </div>
              <FlashFeed items={related} locale={locale} adLabel={dict.adLabel} />
            </div>
          )}
        </article>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col gap-6">
          <div className="sticky top-20 flex flex-col gap-6">
            <LBankAd300x250 label={dict.adLabel} locale={locale} />
            <MarketWidget dict={dict} />
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h3 className="text-base font-bold mb-1">{dict.sectionNewsletter}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{dict.newsletterDesc}</p>
              <input placeholder={dict.emailPh} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm mb-2 outline-none focus:border-[#0066FF]" />
              <button className="w-full px-4 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD]">{dict.subscribeCta}</button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
