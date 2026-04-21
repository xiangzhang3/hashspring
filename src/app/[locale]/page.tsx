import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import dynamic from 'next/dynamic';
import LiveFlashFeed from '@/components/LiveFlashFeed';
import HomepageLeadCarousel from '@/components/HomepageLeadCarousel';
import { TrendingBar } from '@/components/TrendingBar';
import { MarketWidget } from '@/components/MarketWidget';

const FearGreedGauge = dynamic(() => import('@/components/FearGreedGauge'), { ssr: false });
const CoinGeckoTrending = dynamic(() => import('@/components/CoinGeckoTrending'), { ssr: false });
import type { FlashItem } from '@/components/FlashFeed';
import { getHomepageCuration } from '@/lib/server/homepage-curation';
import { localizeArticleList } from '@/lib/server/article-localization';

export const revalidate = 120;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  title_en?: string;
  excerpt_en?: string;
  cover_image: string;
  category: string;
  author: string;
  tags: string[];
  published_at: string;
  read_time: number;
  views: number;
  char_count?: number;
  source?: string;
}

interface FlashRow {
  content_hash: string;
  title: string;
  title_en: string;
  title_zh: string;
  title_fil?: string;
  description: string;
  source: string;
  category: string;
  level: string;
  pub_date: string;
  analysis: string | null;
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

function cleanTitle(text: string): string {
  return text ? text.replace(/[.。．]+\s*$/, '').trim() : text;
}

function relativeTime(pubDate: string, locale: Locale): string {
  try {
    const diff = Date.now() - new Date(pubDate).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (locale === 'zh') {
      if (mins < 1) return '刚刚';
      if (mins < 60) return `${mins}分鐘前`;
      if (hours < 24) return `${hours}小時前`;
      return `${days}天前`;
    }

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return locale === 'zh' ? '剛剛' : 'now';
  }
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

function generateSeoSlug(title: string, hashId: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\$([a-z0-9]+)/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const shortHash = hashId.replace(/^h/, '').slice(0, 8);
  return slug ? `${slug}-${shortHash}` : hashId;
}

function levelStyles(level: FlashItem['level']) {
  if (level === 'red') {
    return {
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
    };
  }
  if (level === 'orange') {
    return {
      badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      dot: 'bg-orange-500',
    };
  }
  return {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  };
}

function getEditorialKicker(article: Article | undefined, locale: Locale) {
  if (!article) {
    return locale === 'zh' ? '首页焦点' : 'Front Page';
  }

  const category = (article.category || '').toLowerCase();
  if (category.includes('policy') || category.includes('regulation')) {
    return locale === 'zh' ? '监管焦点' : 'Policy Brief';
  }
  if (category.includes('market')) {
    return locale === 'zh' ? '市场判断' : 'Market View';
  }
  if (category.includes('research')) {
    return locale === 'zh' ? '研究笔记' : 'Research Note';
  }

  return locale === 'zh' ? '首页焦点' : 'Front Page';
}

async function fetchArticles(limit = 8): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('select', 'id,slug,title,excerpt,title_en,excerpt_en,cover_image,category,author,tags,published_at,read_time,views,char_count,source');
    url.searchParams.set('category', 'eq.analysis');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set('order', 'published_at.desc');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchHomepageFlash(locale: Locale, limit = 8): Promise<FlashItem[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/flash_news`);
    url.searchParams.set('select', 'content_hash,title,title_en,title_zh,title_fil,description,source,category,level,pub_date,analysis');
    url.searchParams.set('order', 'pub_date.desc');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    const rows: FlashRow[] = await res.json();

    return rows.map((row) => ({
      id: generateSeoSlug(row.title_en || row.title || '', row.content_hash),
      level: row.level === 'red' || row.level === 'orange' || row.level === 'blue' ? row.level : 'blue',
      time: relativeTime(row.pub_date, locale),
      title: cleanTitle(locale === 'zh' ? (row.title_zh || row.title) : locale === 'fil' ? (row.title_fil || row.title_en || row.title) : (row.title_en || row.title)),
      description: row.description ? row.description.slice(0, 120).trim() : undefined,
      analysis: row.analysis || undefined,
      category: row.category || 'Crypto',
      source: row.source || undefined,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const isZh = locale === 'zh';

  const title = isEn
    ? 'Bitcoin Cycle 2025-2026 Analysis & Real-Time Crypto News | HashSpring'
    : isZh
      ? '比特币周期分析 2025-2026 | 实时加密货币快讯与深度研究 — HashSpring'
      : 'Bitcoin Cycle 2025-2026 Analysis & Crypto News | HashSpring';

  const description = isEn
    ? 'Advanced Bitcoin market cycle analysis for 2025-2026. Real-time crypto flash news, on-chain data insights, DeFi research, and market intelligence — updated every minute.'
    : isZh
      ? '2025-2026年比特币市场周期深度分析。实时加密货币快讯、链上数据洞察、DeFi研究与全球市场情报，每分钟更新。'
      : 'Advanced Bitcoin market cycle analysis for 2025-2026. Real-time crypto flash news, on-chain insights, and market intelligence.';

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.hashspring.com/${locale}`,
      languages: { en: '/en', zh: '/zh', fil: '/fil', 'x-default': '/en' } as Record<string, string>,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.hashspring.com/${locale}`,
      siteName: 'HashSpring',
      images: [{ url: 'https://www.hashspring.com/og-image.png', width: 1200, height: 630, alt: 'HashSpring' }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@hashspring',
      title,
      description,
      images: ['https://www.hashspring.com/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large' as const,
      'max-video-preview': -1,
    },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isZh = locale === 'zh';

  let rawArticles: Article[] = [];
  let flashItems: FlashItem[] = [];
  let homepageCuration: Awaited<ReturnType<typeof getHomepageCuration>> = { items: [] };

  try {
    [rawArticles, flashItems, homepageCuration] = await Promise.all([
      fetchArticles(8),
      fetchHomepageFlash(locale, 8),
      getHomepageCuration(locale, 5),
    ]);
  } catch (err) {
    console.error('[HomePage] Data fetch failed:', err);
  }

  const articles = await localizeArticleList(rawArticles, locale);
  const curatedItems = homepageCuration.items;
  const heroArticle = curatedItems[0] || articles[0];
  const pulseItems = flashItems.slice(0, 4);
  const kicker = getEditorialKicker(heroArticle, locale);
  const analysisArticles = articles.slice(0, 6);

  return (
    <div className="bg-[linear-gradient(180deg,#eef3f8_0%,#f8fafc_18%,#ffffff_50%)] dark:bg-[linear-gradient(180deg,#070b12_0%,#0b1220_24%,#020617_100%)]">
      <div className="max-w-[1320px] mx-auto px-5 py-6 md:px-6 md:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'HashSpring',
            url: `https://www.hashspring.com/${locale}`,
            description: dict.footerAbout,
            inLanguage: locale === 'zh' ? 'zh-Hans' : 'en',
            publisher: {
              '@type': 'Organization',
              name: 'HashSpring',
              url: 'https://www.hashspring.com',
            },
          }),
        }}
      />

      <h1 className="sr-only">{dict.brand} — {dict.sub}</h1>

      <TrendingBar locale={locale} />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_360px] lg:items-start">
        {/* ── Left column: Carousel + Live Desk ── */}
        <div className="flex flex-col gap-5">
          <HomepageLeadCarousel
            items={curatedItems}
            locale={locale}
            kicker={kicker}
          />

          {/* ── Latest Analysis ── */}
          {analysisArticles.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/72">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {isZh ? '深度栏目' : 'Analysis Desk'}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {isZh ? '最新深度分析' : 'Latest Analysis'}
                  </h3>
                </div>
                <Link
                  href={`/${locale}/analysis`}
                  className="text-sm font-semibold text-[#0066FF] no-underline"
                >
                  {dict.viewAll}
                </Link>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {analysisArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/${locale}/analysis/${article.slug}`}
                    className="group block rounded-xl border border-slate-200/80 bg-slate-50/85 p-4 no-underline transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700"
                  >
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                        {isZh ? '分析' : 'ANALYSIS'}
                      </span>
                      <span className="text-slate-400">
                        {relativeTime(article.published_at, locale)}
                      </span>
                    </div>
                    <h4 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 transition-colors group-hover:text-[#0066FF] dark:text-slate-100">
                      {article.title}
                    </h4>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {cleanExcerpt(article.excerpt)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{article.author || (isZh ? 'HashSpring 编辑部' : 'HashSpring Desk')}</span>
                      <span>{article.read_time || Math.max(1, Math.ceil((article.char_count || 900) / 900))} {isZh ? '分钟' : 'min'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/72">
            <LiveFlashFeed
              initialItems={flashItems}
              locale={locale}
              adLabel={dict.adLabel}
            />
          </div>
        </div>

        {/* ── Right column: Market Pulse + Widgets ── */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:scrollbar-none">
          <div className="rounded-2xl border border-slate-200 bg-white/92 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/72">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {isZh ? '即时脉搏' : 'Market Pulse'}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isZh ? '现在最重要的快讯' : 'What is moving now'}
                </h3>
              </div>
              <Link
                href={`/${locale}/flashnews`}
                className="text-sm font-semibold text-[#0066FF] no-underline"
              >
                {dict.viewAll}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {pulseItems.length > 0 ? pulseItems.map((item) => {
                const styles = levelStyles(item.level);
                return (
                  <Link
                    key={item.id}
                    href={`/${locale}/flash/${encodeURIComponent(item.id)}`}
                    className="block rounded-xl border border-slate-200/80 bg-slate-50/85 p-3.5 no-underline transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                      <span className={`rounded-full px-2 py-0.5 ${styles.badge}`}>
                        {item.level === 'red'
                          ? (isZh ? '突发' : 'BREAKING')
                          : item.level === 'orange'
                            ? (isZh ? '重要' : 'IMPORTANT')
                            : (isZh ? '快讯' : 'FLASH')}
                      </span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.source || item.category}</span>
                      <span>{item.category}</span>
                    </div>
                  </Link>
                );
              }) : (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isZh ? '正在加载最新快讯' : 'Waiting for the latest flash updates'}
                </p>
              )}
            </div>
          </div>

          <MarketWidget dict={dict} />
          <FearGreedGauge locale={locale} />
          <CoinGeckoTrending locale={locale} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {dict.sectionNewsletter}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {dict.newsletterDesc}
            </p>
            <div className="mt-4 space-y-2">
              <input
                placeholder={dict.emailPh}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#0066FF] dark:border-slate-700 dark:bg-slate-950"
              />
              <button className="w-full rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0055dd]">
                {dict.subscribeCta}
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
