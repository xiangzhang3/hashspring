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

/** 清洗摘要：去掉开头的「来源：...作者：...」等原始来源文字 */
function cleanExcerpt(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // 去掉 "来源：Odaily（ID：o-daily）" 类型的前缀
  cleaned = cleaned.replace(/^来源[：:]\s*\S+[（(][^)）]*[)）]\s*/g, '');
  // 去掉 "作者：XXX " 前缀
  cleaned = cleaned.replace(/^作者[：:]\s*\S+\s*/g, '');
  // 去掉 "编者按：..." 前缀但保留内容
  cleaned = cleaned.replace(/^编者按[：:]\s*/g, '');
  // 去掉 "文 | XXX" 或 "文/XXX" 格式
  cleaned = cleaned.replace(/^文\s*[|/｜]\s*\S+\s*/g, '');
  // 去掉 "原文标题：..." 前缀
  cleaned = cleaned.replace(/^原文标题[：:]\s*[^\n]+\s*/g, '');
  // 去掉残留的连续空格
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
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
  // 超过半年显示完整年份
  if (days > 180) {
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/** 根据文章标题生成稳定的渐变色 */
function getTitleGradient(title: string): { from: string; to: string; icon: string } {
  const gradients = [
    { from: '#3B82F6', to: '#8B5CF6', icon: '📊' }, // blue→purple
    { from: '#10B981', to: '#3B82F6', icon: '📈' }, // green→blue
    { from: '#F59E0B', to: '#EF4444', icon: '🔥' }, // amber→red
    { from: '#8B5CF6', to: '#EC4899', icon: '💎' }, // purple→pink
    { from: '#06B6D4', to: '#3B82F6', icon: '🌊' }, // cyan→blue
    { from: '#EF4444', to: '#F59E0B', icon: '⚡' }, // red→amber
    { from: '#10B981', to: '#84CC16', icon: '🌿' }, // green→lime
    { from: '#6366F1', to: '#06B6D4', icon: '🔮' }, // indigo→cyan
  ];
  // 用标题字符码生成稳定 hash
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
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

  // 提取所有出现过的 tag，取前 8 个热门标签
  const tagCounts: Record<string, number> = {};
  articles.forEach((a) => {
    if (a.tags) {
      a.tags.forEach((t) => {
        if (t && t.length < 10) tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    }
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

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

      {/* Header */}
      <div className="mb-5 pb-4 border-b border-[var(--border-color)]">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Research' : '深度分析'}
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'In-depth crypto market analysis and blockchain research — including tuoniaox.com full archive'
            : '深度加密市场分析与区块链研究——包含鸵鸟区块链全部存档内容'}
        </p>
      </div>

      {/* Tag Filter Bar */}
      {topTags.length > 0 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
          <span className="flex-shrink-0 px-3 py-1 text-[12px] font-medium rounded-full bg-blue-600 text-white">
            {isEn ? 'All' : '全部'}
          </span>
          {topTags.map((tag) => (
            <span
              key={tag}
              className="flex-shrink-0 px-3 py-1 text-[12px] rounded-full bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-blue-600 hover:border-blue-400 cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          {/* ══ Featured / Top Article ══ */}
          {featured && (() => {
            const grad = getTitleGradient(featured.title);
            const excerpt = cleanExcerpt(featured.excerpt);
            return (
              <Link href={`/${locale}/analysis/${featured.slug}`} className="block group mb-6">
                <div className="flex gap-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[18px] font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors leading-snug mb-2 line-clamp-2">
                      {featured.title}
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-3">
                      {excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-[12px] text-gray-400">
                      <span className="font-medium text-gray-500">{featured.author || '鸵鸟区块链'}</span>
                      <span>{formatDate(featured.published_at)}</span>
                      {featured.read_time > 0 && (
                        <>
                          <span>·</span>
                          <span>{featured.read_time} min</span>
                        </>
                      )}
                      {featured.views > 0 && (
                        <>
                          <span>·</span>
                          <span>{featured.views.toLocaleString()} {isEn ? 'views' : '阅读'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {featured.cover_image ? (
                    <div className="w-[200px] h-[134px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#1C1F2E]">
                      <img src={featured.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div
                      className="w-[200px] h-[134px] flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform duration-300"
                      style={{ background: `linear-gradient(135deg, ${grad.from}22, ${grad.to}33)` }}
                    >
                      <div className="text-center">
                        <span className="text-3xl block mb-1">{grad.icon}</span>
                        <span className="text-[10px] font-medium block" style={{ color: grad.from }}>{featured.category || 'Analysis'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* Divider */}
          {featured && <div className="border-t border-[var(--border-color)] mb-1" />}

          {/* ══ Article Feed ══ */}
          <div>
            {rest.map((article, idx) => {
              const grad = getTitleGradient(article.title);
              const excerpt = cleanExcerpt(article.excerpt);
              return (
                <Link key={article.id} href={`/${locale}/analysis/${article.slug}`} className="block group">
                  <div className={`flex gap-4 py-5 ${idx < rest.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors leading-snug mb-1.5 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">
                        {excerpt}
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
                        {article.char_count > 0 && (
                          <>
                            <span>·</span>
                            <span>{Math.ceil(article.char_count / 1000)}k {isEn ? 'chars' : '字'}</span>
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
                      <div
                        className="w-[120px] h-[80px] flex-shrink-0 rounded flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${grad.from}18, ${grad.to}28)` }}
                      >
                        <span className="text-xl opacity-70">{grad.icon}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
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

          {/* Load More Hint */}
          {articles.length >= 30 && (
            <div className="py-8 text-center border-t border-[var(--border-color)] mt-4">
              <p className="text-[13px] text-[var(--text-secondary)]">
                {isEn ? `Showing latest 30 articles · More coming soon` : `显示最新 30 篇 · 更多内容即将推出`}
              </p>
            </div>
          )}
        </div>

        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
