#!/usr/bin/env python3
"""
hashspring.com Analysis 板块改版部署脚本
- 创建 API routes (articles, articles/[slug])
- 改版 analysis 列表页 (36kr 风格)
- 改版文章详情页 (带迁移声明)
- 使用方式: cd ~/hashspring-next && python3 deploy_analysis_redesign.py
"""

import os

BASE = os.path.expanduser("~/hashspring-next/src")

files = {}

# ─── 1. API Route: /api/articles/route.ts ───
files[f"{BASE}/app/api/articles/route.ts"] = r'''import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const revalidate = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'analysis';
    const locale = searchParams.get('locale') || 'zh';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;
    const featured = searchParams.get('featured');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
      select: 'id,slug,title,excerpt,cover_image,category,author,tags,locale,published_at,char_count,read_time,views,is_featured,source',
      category: `eq.${category}`,
      locale: `eq.${locale}`,
      is_published: 'eq.true',
      order: 'published_at.desc',
      offset: String(offset),
      limit: String(limit),
    });

    if (featured === 'true') {
      params.set('is_featured', 'eq.true');
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);

    const articles = await res.json();
    const total = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');

    return NextResponse.json({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('[api/articles] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
'''

# ─── 2. API Route: /api/articles/[slug]/route.ts ───
files[f"{BASE}/app/api/articles/[slug]/route.ts"] = r'''import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const qs = new URLSearchParams({
      select: '*',
      slug: `eq.${params.slug}`,
      is_published: 'eq.true',
      limit: '1',
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${qs}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const articles = await res.json();
    if (!articles.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];
    fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ views: (article.views || 0) + 1 }),
    }).catch(() => {});

    return NextResponse.json(article);
  } catch (err: any) {
    console.error('[api/articles/slug] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
'''

# ─── 3. Analysis List Page (36kr style) ───
files[f"{BASE}/app/[locale]/analysis/page.tsx"] = r'''import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string;
  category: string;
  author: string;
  tags: string[];
  published_at: string;
  char_count: number;
  read_time: number;
  views: number;
  is_featured: boolean;
  source: string;
}

async function getArticles(locale: string, page = 1, limit = 20): Promise<{ articles: Article[]; total: number }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { articles: [], total: 0 };
  const offset = (page - 1) * limit;
  const qs = new URLSearchParams({
    select: 'id,slug,title,excerpt,cover_image,category,author,tags,published_at,char_count,read_time,views,is_featured,source',
    category: 'eq.analysis',
    locale: `eq.${locale === 'en' ? 'en' : 'zh'}`,
    is_published: 'eq.true',
    order: 'published_at.desc',
    offset: String(offset),
    limit: String(limit),
  });
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${qs}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
      next: { revalidate: 120 },
    });
    if (!res.ok) return { articles: [], total: 0 };
    const articles = await res.json();
    const total = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
    return { articles, total };
  } catch {
    return { articles: [], total: 0 };
  }
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (locale === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (locale === 'zh') {
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 30) return `${diffDay}天前`;
    return formatDate(dateStr, locale);
  }
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(dateStr, locale);
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const title = isEn
    ? 'Crypto Analysis & Research | In-Depth Blockchain Insights | HashSpring'
    : '加密深度分析与研究 | 区块链行业洞察 | HashSpring';
  const description = isEn
    ? 'In-depth cryptocurrency analysis, blockchain research, and market insights.'
    : '深度加密货币分析、区块链研究与市场洞察。';
  return {
    title, description,
    alternates: {
      canonical: `https://hashspring.com/${locale}/analysis`,
      languages: { en: '/en/analysis', zh: '/zh/analysis', 'x-default': '/en/analysis' },
    },
    openGraph: { title, description, type: 'website', url: `https://hashspring.com/${locale}/analysis`, siteName: 'HashSpring' },
  };
}

export default async function AnalysisPage({ params, searchParams }: { params: { locale: string }; searchParams: { page?: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';
  const page = parseInt(searchParams.page || '1');
  const { articles, total } = await getArticles(locale, page, 20);
  const totalPages = Math.ceil(total / 20);

  const featured = articles.find(a => a.is_featured) || articles[0];
  const rest = articles.filter(a => a !== featured);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: isEn ? 'Crypto Analysis & Research' : '加密深度分析与研究',
        url: `https://hashspring.com/${locale}/analysis`,
        isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://hashspring.com' },
      }) }} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Research' : '深度分析'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn ? 'In-depth analysis, market commentary, and blockchain industry research' : '深度分析、市场点评与区块链行业研究报告'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-0">
          {/* Featured - Large Card */}
          {featured && (
            <Link href={`/${locale}/analysis/${featured.slug}`} className="block group mb-6">
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden hover:border-blue-500/30 transition-colors">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-[400px] h-[200px] md:h-[260px] flex-shrink-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 overflow-hidden">
                    {featured.cover_image ? (
                      <img src={featured.cover_image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="text-5xl opacity-40">📊</span></div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{isEn ? 'Featured' : '精选'}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{formatDate(featured.published_at, locale)}</span>
                      </div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-3 line-clamp-2">{featured.title}</h2>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{featured.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">HS</div>
                        <span className="text-xs text-[var(--text-secondary)]">{featured.author}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        {featured.read_time > 0 && <span>{featured.read_time}{isEn ? ' min' : '分钟'}</span>}
                        {featured.views > 0 && <span>{featured.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Article List - 36kr Style: left text + right thumbnail */}
          <div className="divide-y divide-[var(--border-color)]">
            {rest.map((article) => (
              <Link key={article.id} href={`/${locale}/analysis/${article.slug}`} className="block group">
                <div className="flex gap-4 py-5 hover:bg-[var(--bg-secondary)]/50 transition-colors px-2 -mx-2 rounded">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">{article.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]/70">{article.author}</span>
                      <span>{timeAgo(article.published_at, locale)}</span>
                      {article.views > 0 && <span>{article.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>}
                      {article.tags?.[0] && <span className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px]">{article.tags[0]}</span>}
                    </div>
                  </div>
                  <div className="w-[160px] h-[107px] flex-shrink-0 rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
                    {article.cover_image ? (
                      <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="text-2xl opacity-30">📊</span></div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-[var(--text-secondary)]">{isEn ? 'Analysis articles coming soon...' : '深度分析文章即将上线...'}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-8">
              {page > 1 && (
                <Link href={`/${locale}/analysis?page=${page - 1}`} className="px-4 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg hover:border-blue-500/30 transition-colors">
                  {isEn ? '← Previous' : '← 上一页'}
                </Link>
              )}
              <span className="text-sm text-[var(--text-secondary)] px-4">{page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={`/${locale}/analysis?page=${page + 1}`} className="px-4 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg hover:border-blue-500/30 transition-colors">
                  {isEn ? 'Next →' : '下一页 →'}
                </Link>
              )}
            </div>
          )}
        </div>

        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
'''

# ─── 4. Article Detail Page (with migration notice) ───
files[f"{BASE}/app/[locale]/analysis/[id]/page.tsx"] = r'''import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface Article {
  id: number; slug: string; title: string; excerpt: string; content: string;
  content_html: string; cover_image: string; category: string; author: string;
  tags: string[]; locale: string; source: string; source_url: string;
  published_at: string; char_count: number; read_time: number; views: number;
  is_featured: boolean;
}

async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const qs = new URLSearchParams({ select: '*', slug: `eq.${slug}`, is_published: 'eq.true', limit: '1' });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${qs}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const article = data[0];
    fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ views: (article.views || 0) + 1 }),
    }).catch(() => {});
    return article;
  } catch { return null; }
}

async function getRelatedArticles(locale: string, currentSlug: string): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const qs = new URLSearchParams({
      select: 'id,slug,title,excerpt,cover_image,author,published_at,read_time,tags',
      category: 'eq.analysis', locale: `eq.${locale}`, is_published: 'eq.true',
      slug: `neq.${currentSlug}`, order: 'published_at.desc', limit: '5',
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${qs}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (locale === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const article = await getArticleBySlug(params.id);
  if (!article) return { title: 'Article Not Found | HashSpring' };
  return {
    title: `${article.title} | HashSpring`,
    description: article.excerpt,
    alternates: {
      canonical: `https://hashspring.com/${params.locale}/analysis/${params.id}`,
      languages: { en: `/en/analysis/${params.id}`, zh: `/zh/analysis/${params.id}` },
    },
    openGraph: {
      title: article.title, description: article.excerpt, type: 'article',
      url: `https://hashspring.com/${params.locale}/analysis/${params.id}`,
      siteName: 'HashSpring',
      ...(article.cover_image && { images: [{ url: article.cover_image }] }),
      publishedTime: article.published_at, authors: [article.author],
    },
  };
}

export default async function AnalysisDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';
  const article = await getArticleBySlug(params.id);

  if (!article) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📄</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">{isEn ? 'Article Not Found' : '文章未找到'}</h1>
        <Link href={`/${locale}/analysis`} className="text-blue-500 text-sm hover:underline">{isEn ? '← Back to Analysis' : '← 返回分析列表'}</Link>
      </div>
    );
  }

  const related = await getRelatedArticles(locale, article.slug);
  const isMigrated = article.source === 'tuoniaox';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
        description: article.excerpt, author: { '@type': 'Person', name: article.author },
        datePublished: article.published_at,
        publisher: { '@type': 'Organization', name: 'HashSpring', url: 'https://hashspring.com' },
        url: `https://hashspring.com/${locale}/analysis/${article.slug}`,
        ...(article.cover_image && { image: article.cover_image }),
      }) }} />

      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <Link href={`/${locale}`} className="hover:text-blue-500">{isEn ? 'Home' : '首页'}</Link>
        <span>/</span>
        <Link href={`/${locale}/analysis`} className="hover:text-blue-500">{isEn ? 'Analysis' : '深度分析'}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] truncate max-w-[300px]">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <article className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
          {article.cover_image && (
            <div className="w-full h-[300px] md:h-[400px] overflow-hidden">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Migration Notice - Top */}
            {isMigrated && (
              <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                {isEn
                  ? `This article was originally published on ${formatDate(article.published_at, 'en')} at tuoniaox.com`
                  : `该文章更新于${formatDate(article.published_at, 'zh')}的 tuoniaox.com`}
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{isEn ? 'Analysis' : '深度分析'}</span>
              <span className="text-sm text-[var(--text-secondary)]">{formatDate(article.published_at, locale)}</span>
              {article.read_time > 0 && <span className="text-sm text-[var(--text-secondary)]">· {article.read_time}{isEn ? ' min read' : '分钟阅读'}</span>}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-5 leading-tight">{article.title}</h1>

            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">{article.author?.charAt(0) || 'H'}</div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{article.author}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>{formatDate(article.published_at, locale)}</span>
                  {article.views > 0 && <span>· {article.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>}
                </div>
              </div>
            </div>

            {/* Article Content */}
            {article.content_html ? (
              <div className="prose prose-sm md:prose-base max-w-none text-[var(--text-primary)] prose-headings:text-[var(--text-primary)] prose-a:text-blue-500 prose-img:rounded-lg prose-img:mx-auto prose-p:leading-relaxed prose-p:mb-4 prose-blockquote:border-blue-500 prose-blockquote:bg-[var(--bg-primary)] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded"
                dangerouslySetInnerHTML={{ __html: article.content_html }} />
            ) : (
              <div className="prose prose-sm md:prose-base max-w-none text-[var(--text-primary)] space-y-4">
                {article.content?.split('\n').filter(Boolean).map((para: string, idx: number) => (
                  <p key={idx} className="leading-relaxed">{para}</p>
                ))}
              </div>
            )}

            {/* Migration Notice - Bottom */}
            {isMigrated && (
              <div className="mt-8 px-4 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {isEn
                    ? 'tuoniaox.com has been authorized by the editor-in-chief to migrate all content to hashspring.com. Future content will be published on hashspring.com.'
                    : 'tuoniaox.com 经主编授权，内容全部搬迁到 hashspring.com，后续将在 hashspring.com 持续输出。'}
                </p>
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[var(--border-color)]">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-full border border-[var(--border-color)]">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
              <span className="text-sm text-[var(--text-secondary)]">{isEn ? 'Share:' : '分享：'}</span>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=https://hashspring.com/${locale}/analysis/${article.slug}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-500 text-sm">𝕏 Twitter</a>
              <a href={`https://t.me/share/url?url=https://hashspring.com/${locale}/analysis/${article.slug}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-500 text-sm">Telegram</a>
            </div>
          </div>
        </article>

        <div className="space-y-6">
          {related.length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{isEn ? 'Related Analysis' : '相关分析'}</h3>
              <div className="space-y-4">
                {related.map((r: any) => (
                  <Link key={r.id} href={`/${locale}/analysis/${r.slug}`} className="block group">
                    <div className="flex gap-3">
                      {r.cover_image && (
                        <div className="w-[80px] h-[54px] flex-shrink-0 rounded overflow-hidden bg-[var(--bg-primary)]">
                          <img src={r.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-2 font-medium">{r.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{formatDate(r.published_at, locale)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Sidebar dict={dict} locale={locale} />
        </div>
      </div>
    </div>
  );
}
'''

# ─── Write all files ───
def main():
    print("=" * 60)
    print("HashSpring Analysis 板块改版部署")
    print("=" * 60)

    for filepath, content in files.items():
        dirpath = os.path.dirname(filepath)
        os.makedirs(dirpath, exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content.lstrip("\n"))
        print(f"  ✅ {os.path.relpath(filepath, os.path.expanduser('~/hashspring-next'))}")

    print(f"\n共写入 {len(files)} 个文件")
    print("\n下一步:")
    print("  1. 在 Supabase SQL Editor 运行 create_articles_table.sql")
    print("  2. git add -A && git commit -m 'redesign analysis page (36kr style) + Supabase articles' && git push")
    print("  3. 运行 tuoniaox_scraper.py 抓取文章")
    print("  4. 运行 tuoniaox_importer.py 导入到 Supabase")

if __name__ == "__main__":
    main()
