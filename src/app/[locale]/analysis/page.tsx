import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export const revalidate = 120; // ISR: 2分钟

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
  read_time: number;
  views: number;
  char_count: number;
}

async function fetchArticles(page = 1, pageSize = 30): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const offset = (page - 1) * pageSize;
    const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
    url.searchParams.set('select', 'id,slug,title,excerpt,cover_image,category,author,tags,published_at,read_time,views,char_count');
    url.searchParams.set('is_published', 'eq.true');
    url.searchParams.set('order', 'published_at.desc');
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));

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

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const title = isEn
    ? 'Crypto Analysis & Research | HashSpring'
    : '深度分析与研究 | HashSpring';
  const description = isEn
    ? 'In-depth crypto market analysis, blockchain research, and investment insights.'
    : '来自 HashSpring 与鸵鸟区块链的深度加密市场分析、区块链研究与投资洞察。';
  return {
    title,
    description,
    alternates: {
      canonical: `https://hashspring.com/${locale}/analysis`,
      languages: { en: '/en/analysis', zh: '/zh/analysis', 'x-default': '/en/analysis' },
    },
    openGraph: { title, description, type: 'website', url: `https://hashspring.com/${locale}/analysis`, siteName: 'HashSpring' },
  };
}

export default async function AnalysisPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const articles = await fetchArticles(1, 30);
  const isEn = locale === 'en';

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: isEn ? 'Crypto Analysis & Research' : '深度分析与研究',
            url: `https://hashspring.com/${locale}/analysis`,
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://hashspring.com' },
          }),
        }}
      />

      {/* 36kr-style Header */}
      <div className="mb-6 pb-4 border-b border-[var(--border-color)]">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Research' : '深度分析'}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'In-depth crypto market analysis and blockchain research — including tuoniaox.com full archive'
            : '深度加密市场分析与区块链研究——包含鸵鸟区块链全部存档内容'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          {/* ══ Featured / Top Article (36kr 头条样式) ══ */}
          {featured && (
            <Link href={`/${locale}/analysis/${featured.slug}`} className="block group mb-6">
              <div className="flex gap-5">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors leading-snug mb-2 line-clamp-2">
                    {featured.title}
                  </h2>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-3">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-[12px] text-gray-400">
                    <span className="font-medium text-gray-500">{featured.author || '鸵鸟区块链'}</span>
                    <span>{formatDate(featured.published_at)}</span>
                    {featured.views > 0 && (
                      <>
                        <span>·</span>
                        <span>{featured.views} 阅读</span>
                      </>
                    )}
                  </div>
                </div>
                {featured.cover_image ? (
                  <div className="w-[200px] h-[134px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#1C1F2E]">
                    <img src={featured.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="w-[200px] h-[134px] flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                    <span className="text-3xl opacity-60">📊</span>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* ══ Divider ══ */}
          {featured && <div className="border-t border-[var(--border-color)] mb-1" />}

          {/* ══ Article Feed (36kr 列表样式: title + summary + image) ══ */}
          <div>
            {rest.map((article, idx) => (
              <Link key={article.id} href={`/${locale}/analysis/${article.slug}`} className="block group">
                <div className={`flex gap-4 py-5 ${idx < rest.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors leading-snug mb-1.5 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] text-gray-400">
                      <span className="font-medium text-gray-500">{article.author || '鸵鸟区块链'}</span>
                      <span>·</span>
                      <span>{formatDate(article.published_at)}</span>
                      {article.read_time > 0 && (
                        <>
                          <span>·</span>
                          <span>{article.read_time} min</span>
                        </>
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-blue-500">{article.tags[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {article.cover_image ? (
                    <div className="w-[120px] h-[80px] flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-[#1C1F2E]">
                      <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-[120px] h-[80px] flex-shrink-0 rounded bg-gradient-to-br from-gray-100 to-gray-50 dark:from-[#1C1F2E] dark:to-[#151823] flex items-center justify-center">
                      <span className="text-2xl opacity-40">📄</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {articles.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-[var(--text-secondary)]">
                {isEn ? 'Articles loading...' : '文章加载中...'}
              </p>
            </div>
          )}
        </div>

        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
