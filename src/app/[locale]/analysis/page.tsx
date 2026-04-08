import Link from 'next/link';

import { Sidebar } from '@/components/Sidebar';
import { localizeArticleList } from '@/lib/server/article-localization';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

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
  char_count: number;
  locale?: string;
  source?: string;
}

async function fetchArticles(page = 1, pageSize = 30): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const offset = (page - 1) * pageSize;
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set(
      'select',
      'id,slug,title,excerpt,title_en,excerpt_en,cover_image,category,author,tags,published_at,read_time,views,char_count,locale,source',
    );
    url.searchParams.set('category', 'eq.analysis');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set('order', 'published_at.desc');
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchArticleCount(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 0;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('select', 'id');
    url.searchParams.set('category', 'eq.analysis');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) return 0;
    const range = res.headers.get('content-range');
    if (range) {
      const total = range.split('/')[1];
      return total ? parseInt(total, 10) : 0;
    }
    return 0;
  } catch {
    return 0;
  }
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

function formatDateByLocale(dateStr: string, locale: Locale): string {
  if (!dateStr) return '';

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);

  if (locale === 'en') {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getReadLabel(article: Article, locale: Locale): string {
  const readTime = article.read_time || Math.max(3, Math.ceil((article.char_count || 1200) / 900));
  return locale === 'en' ? `${readTime} min read` : `${readTime} 分钟阅读`;
}

function getSourceLabel(article: Article, locale: Locale): string {
  if (article.source === 'tuoniaox') {
    return locale === 'en' ? 'Tuoniaox Archive' : '鸵鸟区块链存档';
  }
  return locale === 'en' ? 'HashSpring' : 'HashSpring 编辑部';
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const title = isEn ? 'Crypto Analysis & Research | HashSpring' : '深度分析与研究 | HashSpring';
  const description = isEn
    ? 'In-depth crypto market analysis, blockchain research, and translated archive features from HashSpring.'
    : 'HashSpring 深度分析栏目，集中发布加密市场研究、事件解读与鸵鸟区块链分析存档。';

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.hashspring.com/${locale}/analysis`,
      languages: { en: '/en/analysis', zh: '/zh/analysis', 'x-default': '/en/analysis' },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.hashspring.com/${locale}/analysis`,
      siteName: 'HashSpring',
    },
  };
}

export default async function AnalysisPage({ params, searchParams }: { params: { locale: string }; searchParams: { page?: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const pageSize = 30;
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const [rawArticles, totalCount] = await Promise.all([
    fetchArticles(currentPage, pageSize),
    fetchArticleCount(),
  ]);
  const articles = await localizeArticleList(rawArticles, locale);
  const isEn = locale === 'en';
  const totalPages = Math.ceil(totalCount / pageSize);

  const featured = articles[0];
  const topColumn = articles.slice(1, 5);
  const feed = articles.slice(5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: isEn ? 'Crypto Analysis & Research' : '深度分析与研究',
            url: `https://www.hashspring.com/${locale}/analysis`,
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://www.hashspring.com' },
          }),
        }}
      />

      <div className="mb-8 border-b border-[var(--border-color)] pb-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-500">
          <span>{isEn ? 'Analysis Desk' : '分析栏目'}</span>
          <span className="h-1 w-1 rounded-full bg-blue-500" />
          <span>{isEn ? 'Published & Archived' : '正式发布与存档'}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-[2.5rem]">
          {isEn ? 'Research, features, and event analysis' : '研究、解读与分析稿件'}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
          {isEn
            ? 'All published analysis pieces live here, including translated Tuoniaox archive features and new HashSpring reports.'
            : '所有正式发布的分析稿都会进入这里，包括鸵鸟区块链迁移存档，以及 HashSpring 后续持续发布的深度内容。'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {featured && (
            <section className="mb-10 grid gap-5 border-b border-[var(--border-color)] pb-8 lg:grid-cols-[minmax(0,1.45fr)_280px]">
              <Link
                href={`/${locale}/analysis/${featured.slug}`}
                className="group overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)]"
              >
                <div className="aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#10203f_0%,#142750_50%,#2456ff_100%)]">
                  {featured.cover_image ? (
                    <img
                      src={featured.cover_image}
                      alt={featured.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_72%_28%,rgba(78,126,255,0.5),transparent_32%),linear-gradient(135deg,#0f172a,#1d4ed8)] p-7">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
                        {isEn ? 'Lead Analysis' : '头条分析'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-7">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-500">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">
                      {isEn ? 'Featured' : '精选'}
                    </span>
                    <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[var(--text-secondary)]">
                      {getSourceLabel(featured, locale)}
                    </span>
                  </div>
                  <h2 className="text-[1.9rem] font-semibold leading-[1.04] tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-blue-500 md:text-[2.5rem]">
                    {featured.title}
                  </h2>
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                    {cleanExcerpt(featured.excerpt)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                    <span>{featured.author || (isEn ? 'HashSpring Desk' : 'HashSpring 编辑部')}</span>
                    <span>{formatDateByLocale(featured.published_at, locale)}</span>
                    <span>{getReadLabel(featured, locale)}</span>
                    {featured.views > 0 && (
                      <span>{featured.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                    {isEn ? 'Latest Analysis' : '最新分析'}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">{totalCount > 0 ? totalCount : articles.length} {isEn ? 'total' : '篇'}</span>
                </div>
                <div className="space-y-4">
                  {topColumn.map((article, index) => (
                    <Link
                      key={article.id}
                      href={`/${locale}/analysis/${article.slug}`}
                      className="group block border-t border-[var(--border-color)] pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-blue-500">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <h4 className="text-base font-semibold leading-6 text-[var(--text-primary)] transition-colors group-hover:text-blue-500">
                        {article.title}
                      </h4>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {cleanExcerpt(article.excerpt)}
                      </p>
                      <div className="mt-2 text-xs text-[var(--text-secondary)]">
                        {formatDateByLocale(article.published_at, locale)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {isEn ? 'All Published Analysis' : '全部已发布分析'}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {isEn
                    ? 'Event breakdowns, long-form research, and translated archive features.'
                    : '事件解读、长篇研究，以及同步迁移和翻译后的分析内容。'}
                </p>
              </div>
            </div>

            <div>
              {feed.map((article) => (
                <Link
                  key={article.id}
                  href={`/${locale}/analysis/${article.slug}`}
                  className="group block border-b border-[var(--border-color)] py-6 last:border-b-0"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-blue-500">
                        <span>{getSourceLabel(article, locale)}</span>
                        {article.tags?.[0] && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-blue-500/70" />
                            <span>{article.tags[0]}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-[1.35rem] font-semibold leading-8 tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-blue-500">
                        {article.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                        {cleanExcerpt(article.excerpt)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                        <span>{article.author || (isEn ? 'HashSpring Desk' : 'HashSpring 编辑部')}</span>
                        <span>{formatDateByLocale(article.published_at, locale)}</span>
                        <span>{getReadLabel(article, locale)}</span>
                        {article.views > 0 && (
                          <span>{article.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] md:w-[240px]">
                      {article.cover_image ? (
                        <img
                          src={article.cover_image}
                          alt=""
                          className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="aspect-[4/3] bg-[radial-gradient(circle_at_70%_30%,rgba(65,105,225,0.4),transparent_28%),linear-gradient(135deg,#0f172a,#1d4ed8)]" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {articles.length === 0 && (
              <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-16 text-center">
                <p className="text-4xl">.</p>
                <p className="mt-3 text-[var(--text-secondary)]">
                  {isEn ? 'Analysis articles are loading.' : '分析内容正在加载。'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2 border-t border-[var(--border-color)] pt-6">
                {currentPage > 1 && (
                  <Link
                    href={`/${locale}/analysis${currentPage === 2 ? '' : `?page=${currentPage - 1}`}`}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] no-underline transition-colors hover:bg-blue-500 hover:text-white"
                  >
                    {isEn ? '← Previous' : '← 上一页'}
                  </Link>
                )}

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={`/${locale}/analysis${pageNum === 1 ? '' : `?page=${pageNum}`}`}
                      className={`rounded-lg px-3.5 py-2 text-sm font-medium no-underline transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-500 text-white'
                          : 'border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-blue-500/10 hover:text-blue-500'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {currentPage < totalPages && (
                  <Link
                    href={`/${locale}/analysis?page=${currentPage + 1}`}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] no-underline transition-colors hover:bg-blue-500 hover:text-white"
                  >
                    {isEn ? 'Next →' : '下一页 →'}
                  </Link>
                )}

                <span className="ml-3 text-xs text-[var(--text-secondary)]">
                  {isEn
                    ? `Page ${currentPage} of ${totalPages} · ${totalCount} articles`
                    : `第 ${currentPage}/${totalPages} 页 · 共 ${totalCount} 篇`}
                </span>
              </nav>
            )}
          </section>
        </div>

        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
