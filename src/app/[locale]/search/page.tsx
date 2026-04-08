import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const q = searchParams.q || '';
  const title = locale === 'en' ? `Search: ${q} | HashSpring` : `搜尋：${q} | HashSpring`;
  return {
    title,
    description: locale === 'en' ? `Search results for "${q}" on HashSpring crypto news platform.` : `HashSpring 加密貨幣新聞平台「${q}」的搜尋結果。`,
    alternates: { canonical: `https://www.hashspring.com/${locale}/search?q=${encodeURIComponent(q)}` },
    robots: { index: false, follow: true },
  };
}

async function searchNews(q: string, locale: string) {
  if (!q || q.length < 2) return { results: [], total: 0 };
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!baseUrl || !apiKey) return { results: [], total: 0 };
  
  try {
    const filter = `or=(title.ilike.%25${encodeURIComponent(q)}%25,title_en.ilike.%25${encodeURIComponent(q)}%25,title_zh.ilike.%25${encodeURIComponent(q)}%25)`;
    const res = await fetch(
      `${baseUrl}/rest/v1/flash_news?${filter}&select=content_hash,title,title_en,title_zh,description_en,description_zh,category,level,source,pub_date&order=pub_date.desc&limit=30`,
      { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` }, next: { revalidate: 60 } }
    );
    const rows = await res.json();
    return {
      results: (rows || []).map((row: any) => {
        const title = locale === 'zh' ? (row.title_zh || row.title) : (row.title_en || row.title);
        const desc = locale === 'zh' ? (row.description_zh || row.description_en || '') : (row.description_en || row.description_zh || '');
        const slug = (row.title_en || row.title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
        const shortHash = (row.content_hash || '').replace(/^h/, '').slice(0, 8);
        const seoSlug = slug ? `${slug}-${shortHash}` : row.content_hash;
        return { id: seoSlug, title, description: desc.slice(0, 160), category: row.category || 'Crypto', level: row.level || 'blue', source: row.source, published_at: row.pub_date };
      }),
      total: rows?.length || 0,
    };
  } catch { return { results: [], total: 0 }; }
}

const levelColors: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
};

export default async function SearchPage({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const q = searchParams.q || '';
  const { results, total } = await searchNews(q, locale);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search form */}
      <form action={`/${locale}/search`} method="get" className="mb-8">
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder={isEn ? 'Search crypto news...' : '搜尋加密貨幣新聞...'}
            className="w-full py-3 pl-12 pr-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-base text-[var(--text-foreground)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        </div>
      </form>

      {/* Results */}
      {q && (
        <div className="mb-4 text-sm text-[var(--text-muted)]">
          {isEn ? `Found ${results.length} results for "${q}"` : `找到 ${results.length} 條「${q}」的結果`}
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((item: any) => (
            <Link
              key={item.id}
              href={`/${locale}/flash/${encodeURIComponent(item.id)}`}
              className="block p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${levelColors[item.level] || 'bg-blue-500'}`} />
                <span className="text-xs text-[var(--text-muted)]">{item.category}</span>
                {item.source && <span className="text-xs text-[var(--text-muted)]">· {item.source}</span>}
                {item.published_at && (
                  <span className="text-xs text-[var(--text-muted)] ml-auto">
                    {new Date(item.published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-foreground)] mb-1">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">{item.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : q ? (
        <div className="text-center py-12">
          <p className="text-lg text-[var(--text-muted)]">{isEn ? 'No results found' : '未找到相關結果'}</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">{isEn ? 'Try different keywords' : '嘗試使用不同的關鍵詞'}</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-[var(--text-muted)]">{isEn ? 'Enter keywords to search' : '輸入關鍵詞開始搜尋'}</p>
          {/* 热门搜索词 — SEO内链 */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['Bitcoin', 'Ethereum', 'DeFi', 'NFT', 'Solana', 'Layer 2', 'Airdrop', 'Regulation'].map(tag => (
              <Link
                key={tag}
                href={`/${locale}/search?q=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-muted)] hover:border-blue-500/50 hover:text-blue-500 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SEO: 相关页面内链 */}
      <div className="mt-12 pt-8 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-semibold text-[var(--text-foreground)] mb-4">
          {isEn ? 'Browse by Category' : '按分類瀏覽'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: isEn ? 'Flash News' : '快訊', href: `/${locale}/flashnews` },
            { name: isEn ? 'Market Data' : '行情', href: `/${locale}/market` },
            { name: isEn ? 'Analysis' : '分析', href: `/${locale}/analysis` },
            { name: isEn ? 'About' : '關於', href: `/${locale}/about` },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-center text-sm font-medium text-[var(--text-foreground)] hover:border-blue-500/50 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
