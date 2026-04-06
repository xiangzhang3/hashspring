import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 300; // ISR: 5分钟

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  content_html: string;
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
    // Decode in case Next.js passes an already-encoded slug
    const slug = decodeURIComponent(rawSlug);
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('slug', `eq.${slug}`);
    url.searchParams.set('is_published', 'eq.true');
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

async function fetchRelatedArticles(currentId: number, category: string): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('select', 'id,slug,title,excerpt,published_at,category,author');
    url.searchParams.set('id', `neq.${currentId}`);
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

// Increment view count (fire-and-forget)
async function incrementViews(articleId: number) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/increment_article_views`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article_id: articleId }),
      }
    );
  } catch { /* ignore */ }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const article = await fetchArticleBySlug(params.id);
  if (!article) {
    return { title: 'Article Not Found | HashSpring' };
  }
  return {
    title: `${article.title} | HashSpring`,
    description: article.excerpt || article.title,
    alternates: {
      canonical: `https://hashspring.com/${params.locale}/analysis/${params.id}`,
      languages: {
        en: `/en/analysis/${params.id}`,
        zh: `/zh/analysis/${params.id}`,
      },
    },
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      type: 'article',
      url: `https://hashspring.com/${params.locale}/analysis/${params.id}`,
      siteName: 'HashSpring',
      ...(article.cover_image ? { images: [article.cover_image] } : {}),
    },
  };
}

export default async function AnalysisDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';

  const article = await fetchArticleBySlug(params.id);
  if (!article) {
    notFound();
  }

  // Fire-and-forget view increment
  incrementViews(article.id);

  const related = await fetchRelatedArticles(article.id, article.category);
  const isMigrated = article.source === 'tuoniaox';
  const readTime = article.read_time || Math.ceil((article.char_count || 500) / 400);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt,
            datePublished: article.published_at,
            author: { '@type': 'Person', name: article.author || '鸵鸟区块链' },
            publisher: { '@type': 'Organization', name: 'HashSpring', url: 'https://hashspring.com' },
            url: `https://hashspring.com/${locale}/analysis/${article.slug}`,
            ...(article.cover_image ? { image: article.cover_image } : {}),
          }),
        }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <Link href={`/${locale}`} className="hover:text-blue-500">{isEn ? 'Home' : '首頁'}</Link>
        <span>/</span>
        <Link href={`/${locale}/analysis`} className="hover:text-blue-500">{isEn ? 'Analysis' : '分析'}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <article className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
          {/* Hero */}
          {article.cover_image ? (
            <div className="h-56 overflow-hidden">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
          )}

          <div className="p-6">
            {/* Migration Notice */}
            {isMigrated && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-sm text-amber-800 dark:text-amber-200">
                该文章更新于 {formatDate(article.published_at)} 的 tuoniaox.com
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{article.category}</span>
              <span className="text-sm text-[var(--text-secondary)]">{formatDate(article.published_at)}</span>
              <span className="text-sm text-[var(--text-secondary)]">· {readTime} min</span>
              {article.views > 0 && (
                <span className="text-sm text-[var(--text-secondary)]">· {article.views} views</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{article.title}</h1>

            {/* Author */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                {(article.author || 'HS').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{article.author || '鸵鸟区块链'}</p>
                {article.source_url && (
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                    {isEn ? 'Original source' : '查看原文'}
                  </a>
                )}
              </div>
            </div>

            {/* Content */}
            {article.content_html ? (
              <div
                className="prose prose-sm max-w-none text-[var(--text-secondary)] dark:prose-invert prose-headings:text-[var(--text-primary)] prose-a:text-blue-500 prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: article.content_html }}
              />
            ) : (
              <div className="prose prose-sm max-w-none text-[var(--text-secondary)] space-y-4">
                {(article.content || '').split('\n').filter(Boolean).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}

            {/* Migration Footer */}
            {isMigrated && (
              <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-sm text-blue-800 dark:text-blue-200">
                tuoniaox.com 经主编授权，内容全部搬迁到 hashspring.com，后续将在 hashspring.com 持续输出。
              </div>
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[var(--border-color)]">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-full border border-[var(--border-color)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-3 mt-4">
              <span className="text-sm text-[var(--text-secondary)]">{isEn ? 'Share:' : '分享：'}</span>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=https://hashspring.com/${locale}/analysis/${article.slug}`} target="_blank" rel="noopener" className="text-[var(--text-secondary)] hover:text-blue-500">𝕏</a>
              <a href={`https://t.me/share/url?url=https://hashspring.com/${locale}/analysis/${article.slug}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener" className="text-[var(--text-secondary)] hover:text-blue-500">TG</a>
            </div>
          </div>
        </article>

        <div className="space-y-6">
          {/* Related */}
          {related.length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{isEn ? 'Related Articles' : '相关文章'}</h3>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link key={r.id} href={`/${locale}/analysis/${r.slug}`} className="block group">
                    <p className="text-sm text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-2">{r.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{formatDate(r.published_at)}</p>
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
