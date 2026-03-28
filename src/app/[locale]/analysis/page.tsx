import { getDictionary } from '@/lib/i18n';
import { getAnalysisArticles } from '@/lib/mock-data';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return {
    title: `${dict.nav[3]} | HashSpring`,
    description: params.locale === 'en'
      ? 'In-depth crypto analysis, market insights, and expert commentary on blockchain technology.'
      : '深度加密貨幣分析、市場洞察，以及區塊鏈技術專家評論。',
  };
}

export default async function AnalysisPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  const articles = getAnalysisArticles(params.locale);
  const isEn = params.locale === 'en';

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'Analysis & Insights' : '分析與洞察'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Expert analysis, market research and deep dives into crypto trends'
            : '專家分析、市場研究與加密貨幣趨勢深度解讀'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Featured Article */}
          {featured && (
            <Link href={`/${params.locale}/analysis/${featured.id}`} className="block group">
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden hover:border-blue-500/30 transition-colors">
                <div className="h-48 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-4xl">{featured.emoji}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{featured.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{featured.date}</span>
                    <span className="text-xs text-[var(--text-secondary)]">· {featured.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{featured.excerpt}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">HS</div>
                    <span className="text-xs text-[var(--text-secondary)]">{featured.author}</span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Article Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((article) => (
              <Link key={article.id} href={`/${params.locale}/analysis/${article.id}`} className="block group">
                <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4 hover:border-blue-500/30 transition-colors h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{article.emoji}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{article.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{article.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{article.excerpt}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[var(--text-secondary)]">{article.author}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{article.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <Sidebar locale={params.locale} dict={dict} />
      </div>
    </div>
  );
}
