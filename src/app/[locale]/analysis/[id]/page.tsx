import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Sidebar } from '@/components/Sidebar';
import { ReadingProgressBar, TableOfContents } from '@/components/ArticleReadingBar';
import { localizeArticleDetail, localizeArticleList } from '@/lib/server/article-localization';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export const revalidate = 300;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  title_en?: string;
  title_fil?: string;
  excerpt_en?: string;
  excerpt_fil?: string;
  content: string;
  content_html: string;
  content_en?: string;
  content_html_en?: string;
  content_fil?: string;
  content_html_fil?: string;
  cover_image: string;
  category: string;
  author: string;
  tags: string[];
  locale: string;
  source: string;
  source_url: string;
  published_at: string;
  read_time: number;
  views: number;
  char_count: number;
}

async function fetchArticleBySlug(rawSlug: string): Promise<Article | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const slug = decodeURIComponent(rawSlug);
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('slug', `eq.${slug}`);
    url.searchParams.set('category', 'eq.analysis');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set(
      'select',
      'id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,content,content_en,content_fil,content_html,content_html_en,content_html_fil,cover_image,category,author,tags,locale,source,source_url,published_at,read_time,views,char_count',
    );
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const rows: Article[] = await res.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function fetchRelatedArticles(currentId: number): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('select', 'id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,published_at,category,author,locale,source');
    url.searchParams.set('id', `neq.${currentId}`);
    url.searchParams.set('category', 'eq.analysis');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set('order', 'published_at.desc');
    url.searchParams.set('limit', '5');

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function incrementViews(articleId: number) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_article_views`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article_id: articleId }),
    });
  } catch {}
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

function formatDate(dateStr: string, locale: Locale): string {
  if (!dateStr) return '';

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  return locale === 'en'
    ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getReadTime(article: Article): number {
  return article.read_time || Math.max(3, Math.ceil((article.char_count || 1400) / 900));
}

function getSourceLabel(article: Article, locale: Locale): string {
  if (article.source === 'tuoniaox') {
    return locale === 'en' ? 'Tuoniaox Archive' : '鸵鸟区块链存档';
  }
  return locale === 'en' ? 'HashSpring Analysis' : 'HashSpring 分析';
}

function sanitizeContentHtml(html: string): string {
  return html
    .replace(/<div[^>]*>[\s\S]*?tuoniaox\.com[\s\S]*?hashspring\.com[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*>[\s\S]*?tuoniaox\.com[\s\S]*?hashspring\.com[\s\S]*?<\/p>/gi, '')
    .replace(/<div[^>]*>该文章更新于[\s\S]*?<\/div>/g, '')
    .replace(/<p[^>]*>该文章更新于[\s\S]*?<\/p>/g, '')
    .replace(/tuoniaox\.com\s*经主编授权[^<\n]*/g, '')
    .replace(/该文章更新于[^<\n]*/g, '')
    .replace(/\[该文章更新于[^\]]*\]\s*/g, '')
    .replace(/---\s*tuoniaox\.com[\s\S]*$/g, '')
    .replace(/<p[^>]*>[\s\S]*?yuanben\.io[\s\S]*?<\/p>/gi, '')
    .replace(/本文经[「「]原本[」」][^<\n]*/g, '');
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const article = await fetchArticleBySlug(params.id);

  if (!article) {
    return { title: 'Article Not Found | HashSpring' };
  }

  const localizedArticle = await localizeArticleDetail(article, locale);

  const seoTitle = `${localizedArticle.title} — Expert Crypto Analysis | HashSpring`;
  const rawDesc = localizedArticle.excerpt || localizedArticle.title;
  const seoDesc = rawDesc.length > 120 ? rawDesc.slice(0, 155) + '...' : `${rawDesc} — In-depth research and analysis from HashSpring.`;
  const canonicalUrl = `https://www.hashspring.com/${params.locale}/analysis/${params.id}`;
  const ogImage = article.cover_image || `https://www.hashspring.com/api/og?title=${encodeURIComponent(localizedArticle.title)}&type=analysis`;

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: article.tags?.join(', ') || undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `/en/analysis/${params.id}`,
        zh: `/zh/analysis/${params.id}`,
        fil: `/fil/analysis/${params.id}`,
        'x-default': `/en/analysis/${params.id}`,
      } as Record<string, string>,
    },
    openGraph: {
      title: localizedArticle.title,
      description: seoDesc,
      type: 'article',
      url: canonicalUrl,
      siteName: 'HashSpring',
      locale: locale === 'zh' ? 'zh_CN' : locale === 'fil' ? 'fil_PH' : 'en_US',
      publishedTime: article.published_at,
      authors: [article.author || 'HashSpring Research'],
      section: 'Analysis',
      tags: article.tags || [],
      images: [{ url: ogImage, width: 1200, height: 630, alt: localizedArticle.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: localizedArticle.title,
      description: seoDesc,
      images: [ogImage],
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

export default async function AnalysisDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en' || locale === 'fil';

  const article = await fetchArticleBySlug(params.id);
  if (!article) notFound();

  const localizedArticle = await localizeArticleDetail(article, locale);
  incrementViews(localizedArticle.id);

  const related = await localizeArticleList(await fetchRelatedArticles(localizedArticle.id), locale);
  const isAiTranslated = Boolean((localizedArticle as Article & { isAiTranslated?: boolean }).isAiTranslated && isEn);
  const translatedContent = (localizedArticle as Article & { translatedContent?: string }).translatedContent || '';
  const deck = cleanExcerpt(localizedArticle.excerpt || '');
  const readTime = getReadTime(localizedArticle);

  return (
    <>
    <ReadingProgressBar />
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: localizedArticle.title,
            description: localizedArticle.excerpt,
            datePublished: localizedArticle.published_at,
            dateModified: localizedArticle.published_at,
            author: {
              '@type': 'Organization',
              name: localizedArticle.author || 'HashSpring Research',
              url: 'https://www.hashspring.com',
            },
            publisher: {
              '@type': 'Organization',
              name: 'HashSpring',
              url: 'https://www.hashspring.com',
              logo: { '@type': 'ImageObject', url: 'https://www.hashspring.com/logo.png', width: 600, height: 60 },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://www.hashspring.com/${locale}/analysis/${localizedArticle.slug}`,
            },
            url: `https://www.hashspring.com/${locale}/analysis/${localizedArticle.slug}`,
            inLanguage: locale === 'zh' ? 'zh-Hans' : locale === 'fil' ? 'fil' : 'en',
            articleSection: 'Crypto Analysis',
            wordCount: localizedArticle.char_count || undefined,
            image: localizedArticle.cover_image
              ? { '@type': 'ImageObject', url: localizedArticle.cover_image, width: 1200, height: 630 }
              : { '@type': 'ImageObject', url: 'https://www.hashspring.com/default-cover.svg', width: 1200, height: 630 },
            keywords: (localizedArticle.tags || []).join(', '),
            isAccessibleForFree: true,
          }),
        }}
      />

      <nav className="mb-5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href={`/${locale}`} className="hover:text-blue-500">
          {isEn ? 'Home' : '首页'}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/analysis`} className="hover:text-blue-500">
          {isEn ? 'Analysis' : '分析'}
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <header className="border-b border-[var(--border-color)] pb-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-500">
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">
                {isEn ? 'Analysis' : '分析'}
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[var(--text-secondary)]">
                {getSourceLabel(localizedArticle, locale)}
              </span>
            </div>

            <h1 className="max-w-4xl text-[2.2rem] font-semibold leading-[1.02] tracking-tight text-[var(--text-primary)] md:text-[3.6rem]">
              {localizedArticle.title}
            </h1>

            {deck && (
              <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[var(--text-secondary)] md:text-[17px]">
                {deck}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span>{localizedArticle.author || (isEn ? 'HashSpring Desk' : 'HashSpring 编辑部')}</span>
              <span>{formatDate(localizedArticle.published_at, locale)}</span>
              <span>{isEn ? `${readTime} min read` : `${readTime} 分钟阅读`}</span>
              {localizedArticle.views > 0 && (
                <span>{localizedArticle.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>
              )}
              {localizedArticle.source_url && (
                <a
                  href={localizedArticle.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {isEn ? 'Original source' : '查看原文'}
                </a>
              )}
            </div>
          </header>

          {localizedArticle.cover_image ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[28px] border border-[var(--border-color)]">
              <Image src={localizedArticle.cover_image} alt={localizedArticle.title} fill className="object-cover" priority />
            </div>
          ) : null}

          {isAiTranslated && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {isEn
                ? 'This English version is AI translated from the original Chinese article and has been published alongside the archive entry.'
                : ''}
            </div>
          )}

          <div className="mt-10">
            {isAiTranslated ? (
              <div className="prose prose-lg max-w-none text-[var(--text-secondary)] dark:prose-invert prose-headings:text-[var(--text-primary)] prose-p:leading-8 prose-a:text-blue-500 prose-img:rounded-2xl">
                {translatedContent
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : localizedArticle.content_html ? (
              <div
                className="prose prose-lg max-w-none text-[var(--text-secondary)] dark:prose-invert prose-headings:text-[var(--text-primary)] prose-headings:tracking-tight prose-p:leading-8 prose-a:text-blue-500 prose-img:rounded-2xl prose-blockquote:border-blue-500 prose-blockquote:text-[var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(localizedArticle.content_html) }}
              />
            ) : (
              <div className="prose prose-lg max-w-none text-[var(--text-secondary)] dark:prose-invert prose-p:leading-8">
                {(localizedArticle.content || '')
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            )}
          </div>

          {localizedArticle.tags && localizedArticle.tags.length > 0 && (
            <div className="mt-10 border-t border-[var(--border-color)] pt-6">
              <div className="flex flex-wrap gap-2">
                {localizedArticle.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:scrollbar-none">
          <TableOfContents locale={locale} />

          {related.length > 0 && (
            <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                {isEn ? 'More Analysis' : '更多分析'}
              </h3>
              <div className="space-y-4">
                {related.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/${locale}/analysis/${relatedArticle.slug}`}
                    className="group block border-t border-[var(--border-color)] pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-blue-500">
                      {getSourceLabel(relatedArticle, locale)}
                    </div>
                    <p className="mt-2 text-base font-semibold leading-6 text-[var(--text-primary)] transition-colors group-hover:text-blue-500">
                      {relatedArticle.title}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {formatDate(relatedArticle.published_at, locale)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Sidebar dict={dict} locale={locale} />
        </div>
      </div>
    </div>
    </>
  );
}
