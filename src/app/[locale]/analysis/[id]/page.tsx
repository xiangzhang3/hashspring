import { getDictionary } from '@/lib/i18n';
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
