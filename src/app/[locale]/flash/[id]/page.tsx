import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import type { FlashItem } from '@/components/FlashFeed';
import { LogoBadge } from '@/components/Logo';
import { FlashFeed } from '@/components/FlashFeed';
import { LBankAd300x250 } from '@/components/LBankAd';
import { MarketWidget } from '@/components/MarketWidget';
import { getFlashItems } from '@/lib/mock-data';
import Link from 'next/link';

/* ─── Fetch flash news from API ──────────────────────────── */
async function getFlashNewsFromAPI(locale: string): Promise<FlashItem[]> {
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const apiUrl = `${protocol}://${host}/api/flash-news?locale=${locale}`;
    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.warn('Flash API fetch failed:', e);
  }
  return getFlashItems(locale as Locale);
}

/* ─── Find article by ID from the news list ──────────────── */
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
  // Fallback: use first article
  return {
    article: items[0] || null,
    prevArticle: null,
    nextArticle: items.length > 1 ? items[1] : null,
    related: items.slice(1, 6),
  };
}

/* ─── Metadata ───────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const items = await getFlashNewsFromAPI(locale);
  const { article } = findArticleById(items, params.id);

  const title = article ? article.title : 'Flash News';
  const description = article
    ? article.title.slice(0, 160)
    : 'Latest crypto flash news from HashSpring';

  return {
    title: `${title} | HashSpring`,
    description,
    alternates: {
      canonical: `https://hashspring.com/${locale}/flash/${params.id}`,
      languages: {
        en: `/en/flash/${params.id}`,
        zh: `/zh/flash/${params.id}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://hashspring.com/${locale}/flash/${params.id}`,
      siteName: 'HashSpring',
    },
  };
}

/* ─── Page Component ─────────────────────────────────────── */
export default async function FlashDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';

  const allItems = await getFlashNewsFromAPI(locale);
  const { article, prevArticle, nextArticle, related } = findArticleById(allItems, params.id);

  if (!article) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{isEn ? 'Article Not Found' : '文章未找到'}</h1>
        <Link href={`/${locale}`} className="text-blue-500 hover:underline">
          {isEn ? 'Back to Home' : '返回首页'}
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
    mainEntityOfPage: `https://hashspring.com/${locale}/flash/${params.id}`,
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
              {['X', 'Telegram', 'Reddit', 'Copy Link'].map((btn) => (
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

            {/* Internal anchor links — SEO interlinks to category & related pages */}
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
              <Link href={`/${locale}/analysis`} className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                {isEn ? 'Analysis & Insights' : '分析洞察'} →
              </Link>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {isEn
                ? 'This is a flash news update aggregated and curated by HashSpring. For the full article and more details, please visit the original source below.'
                : '本条快讯由 HashSpring 聚合并编辑发布。如需查看完整报道和更多详情，请点击下方原文链接。'}
            </p>
          </div>

          {/* ═══ Read Original Source — the key feature ═══ */}
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

          {/* Tags — based on category */}
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
            ) : (
              <div />
            )}
            {nextArticle ? (
              <Link
                href={`/${locale}/flash/${encodeURIComponent(nextArticle.id)}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-[11px] font-semibold text-gray-400 mb-2">{dict.nextLabel} →</div>
                <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">{nextArticle.title}</div>
              </Link>
            ) : (
              <div />
            )}
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
            <LBankAd300x250 label={dict.adLabel} />
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
