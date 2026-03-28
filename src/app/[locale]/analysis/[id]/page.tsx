import { getDictionary } from '@/lib/i18n';
import { getAnalysisArticles } from '@/lib/mock-data';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const articles = getAnalysisArticles(params.locale);
  const article = articles.find((a) => a.id === params.id) || articles[0];
  return {
    title: `${article.title} | HashSpring`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      siteName: 'HashSpring',
    },
  };
}

export default async function AnalysisDetailPage({ params }: { params: { locale: string; id: string } }) {
  const dict = await getDictionary(params.locale);
  const articles = getAnalysisArticles(params.locale);
  const article = articles.find((a) => a.id === params.id) || articles[0];
  const isEn = params.locale === 'en';
  const related = articles.filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <Link href={`/${params.locale}`} className="hover:text-blue-500">{isEn ? 'Home' : '首頁'}</Link>
        <span>/</span>
        <Link href={`/${params.locale}/analysis`} className="hover:text-blue-500">{isEn ? 'Analysis' : '分析'}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <article className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
          {/* Hero */}
          <div className="h-56 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
            <span className="text-6xl">{article.emoji}</span>
          </div>

          <div className="p-6">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{article.category}</span>
              <span className="text-sm text-[var(--text-secondary)]">{article.date}</span>
              <span className="text-sm text-[var(--text-secondary)]">· {article.readTime}</span>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{article.title}</h1>

            {/* Author */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">HS</div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{article.author}</p>
                <p className="text-xs text-[var(--text-secondary)]">HashSpring {isEn ? 'Research' : '研究院'}</p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none text-[var(--text-secondary)] space-y-4">
              {article.content.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[var(--border-color)]">
              {article.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-full border border-[var(--border-color)]">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Share */}
            <div className="flex items-center gap-3 mt-4">
              <span className="text-sm text-[var(--text-secondary)]">{isEn ? 'Share:' : '分享：'}</span>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=https://hashspring.com/${params.locale}/analysis/${article.id}`} target="_blank" rel="noopener" className="text-[var(--text-secondary)] hover:text-blue-500">𝕏</a>
              <a href={`https://t.me/share/url?url=https://hashspring.com/${params.locale}/analysis/${article.id}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener" className="text-[var(--text-secondary)] hover:text-blue-500">TG</a>
            </div>
          </div>
        </article>

        <div className="space-y-6">
          {/* Related */}
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">{isEn ? 'Related Analysis' : '相關分析'}</h3>
            <div className="space-y-3">
              {related.map((r) => (
                <Link key={r.id} href={`/${params.locale}/analysis/${r.id}`} className="block group">
                  <p className="text-sm text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-2">{r.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{r.date}</p>
                </Link>
              ))}
            </div>
          </div>

          <Sidebar dict={dict} />
        </div>
      </div>
    </div>
  );
}
