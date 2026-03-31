import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Fetch analysis items from Supabase ──
async function getAnalysisItems(locale: string) {
  const titleField = locale === 'zh' ? 'title_zh' : 'title_en';
  const descField = locale === 'zh' ? 'description_zh' : 'description_en';
  const analysisField = locale === 'zh' ? 'analysis_zh' : 'analysis_en';

  // Match analysis-type content: category = Analysis OR source is analysis-focused
  const analysisSources = 'source.in.(Messari,Nansen,Glassnode,CryptoQuant,Delphi Digital,Bankless,IntoTheBlock,Chainalysis,Artemis)';
  const analysisCategory = 'category.ilike.%analysis%';

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash,${titleField},${descField},${analysisField},category,level,pub_date,source,link&or=(${analysisCategory},${analysisSources})&order=pub_date.desc&limit=30`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 120 },
    }
  );

  if (!res.ok) return [];
  const rows = await res.json();

  return rows.map((row: any) => {
    const title = row[titleField] || row.title_en || '';
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').slice(0, 60);
    const pubDate = row.pub_date ? new Date(row.pub_date) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - pubDate.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const timeAgo = diffH < 1 ? (locale === 'zh' ? '剛剛' : 'Just now')
      : diffH < 24 ? (locale === 'zh' ? `${diffH} 小時前` : `${diffH}h ago`)
      : (locale === 'zh' ? `${Math.floor(diffH / 24)} 天前` : `${Math.floor(diffH / 24)}d ago`);

    // Estimate read time from description + analysis length
    const textLen = (row[descField] || '').length + (row[analysisField] || '').length;
    const readMin = Math.max(2, Math.ceil(textLen / 300));

    return {
      id: row.content_hash,
      slug,
      title,
      excerpt: row[descField] || row[analysisField] || '',
      analysis: row[analysisField] || '',
      category: row.category || 'Analysis',
      source: row.source || 'HashSpring',
      timeAgo,
      readTime: locale === 'zh' ? `${readMin} 分鐘閱讀` : `${readMin} min read`,
      date: pubDate.toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' }),
      level: row.level || 'blue',
      link: row.link,
    };
  });
}

// Category emoji mapping
function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Analysis': '📊', 'Bitcoin': '₿', 'BTC': '₿', 'Ethereum': '⟠', 'ETH': '⟠',
    'DeFi': '🔄', 'NFT': '🖼️', 'Layer 2': '⚡', 'L2': '⚡', 'Policy': '⚖️',
    'Regulation': '⚖️', 'Solana': '◎', 'SOL': '◎', 'Exchange': '🏛️',
    'Stablecoin': '💵', 'AI': '🤖', 'Macro': '🌐', 'Mining': '⛏️',
  };
  return map[category] || '📈';
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const description = locale === 'en'
    ? 'In-depth crypto analysis, market insights, and expert commentary on blockchain technology.'
    : '深度加密貨幣分析、市場洞察，以及區塊鏈技術專家評論。';
  return {
    title: `${dict.nav[3]} | HashSpring`,
    description,
    alternates: {
      canonical: `https://hashspring.com/${locale}/analysis`,
      languages: { en: '/en/analysis', zh: '/zh/analysis' },
    },
    openGraph: {
      title: `${dict.nav[3]} | HashSpring`,
      description,
      type: 'website',
      url: `https://hashspring.com/${locale}/analysis`,
      siteName: 'HashSpring',
    },
  };
}

export default async function AnalysisPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const articles = await getAnalysisItems(locale);
  const isEn = locale === 'en';

  const featured = articles[0];
  const rest = articles.slice(1);

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isEn ? 'Crypto Analysis & Insights' : '加密貨幣分析與洞察',
    url: `https://hashspring.com/${locale}/analysis`,
    description: isEn
      ? 'In-depth crypto analysis, market insights, and expert commentary.'
      : '深度加密貨幣分析、市場洞察，以及區塊鏈技術專家評論。',
    isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://hashspring.com' },
    numberOfItems: articles.length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Insights' : '分析與洞察'}
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Expert analysis, market research and deep dives into crypto trends'
            : '專家分析、市場研究與加密貨幣趨勢深度解讀'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">

          {/* Empty state */}
          {articles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {isEn ? 'No analysis articles yet' : '暫無分析文章'}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {isEn ? 'Check back soon for in-depth crypto analysis.' : '敬請期待深度加密貨幣分析。'}
              </p>
              <Link href={`/${locale}/flashnews`} className="inline-block mt-4 text-sm text-[#0066FF] font-medium no-underline hover:underline">
                {isEn ? 'Browse Flash News →' : '瀏覽快訊 →'}
              </Link>
            </div>
          )}

          {/* Featured Article */}
          {featured && (
            <Link href={`/${locale}/flash/${encodeURIComponent(featured.id)}`} className="block group">
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden hover:border-blue-500/30 transition-colors">
                <div className="h-48 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-4xl">{getCategoryEmoji(featured.category)}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-500/10 text-blue-500 rounded">{featured.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{featured.date}</span>
                    <span className="text-xs text-[var(--text-secondary)]">· {featured.readTime}</span>
                    {featured.source && (
                      <span className="text-xs text-[var(--text-secondary)]">· {featured.source}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-3">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{featured.excerpt}</p>
                  {featured.analysis && featured.analysis !== featured.excerpt && (
                    <div className="mt-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20">
                      <p className="text-[13px] text-purple-700 dark:text-purple-300 line-clamp-2 flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {featured.analysis}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">HS</div>
                    <span className="text-xs text-[var(--text-secondary)]">HashSpring · {featured.timeAgo}</span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Article Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rest.map((article) => (
                <Link key={article.id} href={`/${locale}/flash/${encodeURIComponent(article.id)}`} className="block group">
                  <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 hover:border-blue-500/30 transition-colors h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryEmoji(article.category)}</span>
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-500/10 text-blue-500 rounded">{article.category}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{article.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-[var(--text-secondary)]">{article.source} · {article.timeAgo}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{article.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
