import { getDictionary } from '@/lib/i18n';
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
