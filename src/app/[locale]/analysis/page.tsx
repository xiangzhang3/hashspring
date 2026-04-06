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

async function fetchArticles(page = 1, pageSize = 21): Promise<Article[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const offset = (page - 1) * pageSize;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=id,slug,title,excerpt,cover_image,category,author,tags,published_at,read_time,views,char_count&is_published=eq.true&order=published_at.desc&limit=${pageSize}&offset=${offset}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 120 },
      }
    );
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
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    analysis: '📊', news: '📰', tutorial: '📘', bitcoin: '₿',
    ethereum: '⟠', defi: '🏦', nft: '🖼️', regulation: '⚖️',
  };
  return map[cat?.toLowerCase()] || '📊';
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const title = isEn
    ? 'Crypto Analysis & Research | HashSpring'
    : '深度分析与研究 | HashSpring';
  const description = isEn
    ? 'In-depth crypto market analysis, blockchain research, and investment insights from HashSpring and tuoniaox.com archive.'
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
  const articles = await fetchArticles(1, 21);
  const isEn = locale === 'en';

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: isEn ? 'Crypto Analysis & Research' : '深度分析与研究',
            url: `https://hashspring.com/${locale}/analysis`,
            description: isEn
              ? 'In-depth crypto market analysis and blockchain research.'
              : '深度加密市场分析与区块链研究。',
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://hashspring.com' },
          }),
        }}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Research' : '深度分析'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'In-depth crypto market analysis, on-chain insights, and research articles — including the full tuoniaox.com archive'
            : '深度加密市场分析、链上数据洞察与研究文章——包含鸵鸟区块链全部存档内容'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Featured Article */}
          {featured && (
            <Link href={`/${locale}/analysis/${featured.slug}`} className="block group">
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden hover:border-blue-500/30 transition-colors">
                {featured.cover_image ? (
                  <div className="h-48 overflow-hidden">
                    <img src={featured.cover_image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                    <span className="text-4xl">{categoryEmoji(featured.category)}</span>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{featured.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{formatDate(featured.published_at)}</span>
                    <span className="text-xs text-[var(--text-secondary)]">· {featured.read_time || Math.ceil((featured.char_count || 500) / 400)} min</span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{featured.excerpt}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">HS</div>
                    <span className="text-xs text-[var(--text-secondary)]">{featured.author || '鸵鸟区块链'}</span>
                    {featured.views > 0 && (
                      <span className="text-xs text-[var(--text-secondary)] ml-auto">{featured.views} views</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Article Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rest.map((article) => (
                <Link key={article.id} href={`/${locale}/analysis/${article.slug}`} className="block group">
                  <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 hover:border-blue-500/30 transition-colors h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{categoryEmoji(article.category)}</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{article.category}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{formatDate(article.published_at)}</span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-[var(--text-secondary)]">{article.author || '鸵鸟区块链'}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{article.read_time || Math.ceil((article.char_count || 500) / 400)} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

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
