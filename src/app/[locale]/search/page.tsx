import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import Link from 'next/link';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function generateMetadata({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string } }): Promise<Metadata> {
  const locale = params.locale as Locale;
  const q = searchParams.q || '';
  const title = locale === 'en' ? `Search: ${q} | HashSpring` : locale === 'fil' ? `Paghahanap: ${q} | HashSpring` : `搜尋：${q} | HashSpring`;
  return {
    title,
    description: locale === 'en' ? `Search results for "${q}" on HashSpring crypto news platform.` : `HashSpring 加密貨幣新聞平台「${q}」的搜尋結果。`,
    alternates: { canonical: `https://www.hashspring.com/${locale}/search?q=${encodeURIComponent(q)}` },
    robots: { index: false, follow: true },
  };
}

interface SearchResult {
  id: string;
  type: 'flash' | 'article';
  title: string;
  description: string;
  category: string;
  level: string;
  source: string;
  published_at: string;
  url: string;
}

async function searchAll(q: string, locale: string): Promise<{ results: SearchResult[]; total: number; flash_count: number; article_count: number }> {
  if (!q || q.length < 2 || !SUPABASE_URL || !SUPABASE_KEY) {
    return { results: [], total: 0, flash_count: 0, article_count: 0 };
  }

  const encoded = encodeURIComponent(q);
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: 'count=exact',
  };

  try {
    // Search flash_news (title + body + description)
    const flashFilter = `or=(title.ilike.%25${encoded}%25,title_en.ilike.%25${encoded}%25,title_zh.ilike.%25${encoded}%25,body_en.ilike.%25${encoded}%25,body_zh.ilike.%25${encoded}%25,description.ilike.%25${encoded}%25)`;
    const flashPromise = fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?${flashFilter}&select=content_hash,title,title_en,title_zh,title_fil,description,description_en,description_zh,category,level,source,pub_date&order=pub_date.desc&limit=30`,
      { headers, next: { revalidate: 60 } },
    );

    // Search articles (title + excerpt + content)
    const articleFilter = `or=(title.ilike.%25${encoded}%25,title_en.ilike.%25${encoded}%25,excerpt.ilike.%25${encoded}%25,excerpt_en.ilike.%25${encoded}%25,content.ilike.%25${encoded}%25)`;
    const articlePromise = fetch(
      `${SUPABASE_URL}/rest/v1/articles?${articleFilter}&is_published=eq.true&select=id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,category,author,published_at,source&order=published_at.desc&limit=30`,
      { headers, next: { revalidate: 60 } },
    );

    const [flashRes, articleRes] = await Promise.all([flashPromise, articlePromise]);

    const flashRows = flashRes.ok ? await flashRes.json() : [];
    const articleRows = articleRes.ok ? await articleRes.json() : [];

    const flashResults: SearchResult[] = (flashRows || []).map((row: any) => {
      const title = locale === 'zh' ? (row.title_zh || row.title) : locale === 'fil' ? (row.title_fil || row.title_en || row.title) : (row.title_en || row.title);
      const desc = locale === 'zh' ? (row.description_zh || row.description_en || row.description || '') : (row.description_en || row.description_zh || row.description || '');
      const slug = (row.title_en || row.title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
      const shortHash = (row.content_hash || '').replace(/^h/, '').slice(0, 8);
      const seoSlug = slug ? `${slug}-${shortHash}` : row.content_hash;
      return {
        id: seoSlug,
        type: 'flash' as const,
        title,
        description: desc.slice(0, 160),
        category: row.category || 'Crypto',
        level: row.level || 'blue',
        source: row.source || '',
        published_at: row.pub_date,
        url: `/${locale}/flash/${encodeURIComponent(seoSlug)}`,
      };
    });

    const articleResults: SearchResult[] = (articleRows || []).map((row: any) => {
      const title = locale === 'zh' ? (row.title || row.title_en) : locale === 'fil' ? (row.title_fil || row.title_en || row.title) : (row.title_en || row.title);
      const desc = locale === 'zh' ? (row.excerpt || row.excerpt_en || '') : locale === 'fil' ? (row.excerpt_fil || row.excerpt_en || row.excerpt || '') : (row.excerpt_en || row.excerpt || '');
      return {
        id: row.slug,
        type: 'article' as const,
        title,
        description: desc.slice(0, 160),
        category: row.category || 'analysis',
        level: 'blue',
        source: row.source || row.author || '',
        published_at: row.published_at,
        url: `/${locale}/analysis/${row.slug}`,
      };
    });

    const allResults = [...flashResults, ...articleResults]
      .sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 50);

    return {
      results: allResults,
      total: flashResults.length + articleResults.length,
      flash_count: flashResults.length,
      article_count: articleResults.length,
    };
  } catch {
    return { results: [], total: 0, flash_count: 0, article_count: 0 };
  }
}

const levelColors: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
};

const typeLabels: Record<string, Record<string, string>> = {
  flash: { en: 'Flash', zh: '快訊', fil: 'Flash' },
  article: { en: 'Article', zh: '文章', fil: 'Artikulo' },
};

/** Highlight matching keywords in text (case-insensitive, supports CJK) */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2 || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/40 text-[var(--text-foreground)] rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default async function SearchPage({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const q = searchParams.q || '';
  const { results, total, flash_count, article_count } = await searchAll(q, locale);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search form */}
      <form action={`/${locale}/search`} method="get" className="mb-8">
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder={isEn ? 'Search news & articles...' : locale === 'fil' ? 'Maghanap ng balita...' : '搜尋新聞與文章...'}
            className="w-full py-3 pl-12 pr-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-base text-[var(--text-foreground)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">&#x1F50D;</span>
        </div>
      </form>

      {/* Results count */}
      {q && (
        <div className="mb-4 text-sm text-[var(--text-muted)]">
          {isEn
            ? `Found ${total} results for "${q}" — ${flash_count} flash news, ${article_count} articles`
            : locale === 'fil'
            ? `Nakahanap ng ${total} resulta para sa "${q}" — ${flash_count} flash news, ${article_count} artikulo`
            : `找到 ${total} 條「${q}」的結果 — ${flash_count} 條快訊、${article_count} 篇文章`}
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.url}
              className="block p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {/* Type badge */}
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  item.type === 'article'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'bg-blue-500/15 text-blue-400'
                }`}>
                  {typeLabels[item.type]?.[locale] || item.type}
                </span>
                <span className={`w-2 h-2 rounded-full ${levelColors[item.level] || 'bg-blue-500'}`} />
                <span className="text-xs text-[var(--text-muted)]">{item.category}</span>
                {item.source && <span className="text-xs text-[var(--text-muted)]">· {item.source}</span>}
                {item.published_at && (
                  <span className="text-xs text-[var(--text-muted)] ml-auto">
                    {new Date(item.published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-foreground)] mb-1">
                <Highlight text={item.title} query={q} />
              </h3>
              {item.description && (
                <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                  <Highlight text={item.description} query={q} />
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : q ? (
        <div className="text-center py-12">
          <p className="text-lg text-[var(--text-muted)]">{isEn ? 'No results found' : locale === 'fil' ? 'Walang nahanap na resulta' : '未找到相關結果'}</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">{isEn ? 'Try different keywords' : locale === 'fil' ? 'Subukan ang ibang keyword' : '嘗試使用不同的關鍵詞'}</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-[var(--text-muted)]">{isEn ? 'Enter keywords to search' : locale === 'fil' ? 'Mag-type ng keyword para maghanap' : '輸入關鍵詞開始搜尋'}</p>
          {/* Popular search tags — SEO internal links */}
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

      {/* Browse by category — SEO internal links */}
      <div className="mt-12 pt-8 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-semibold text-[var(--text-foreground)] mb-4">
          {isEn ? 'Browse by Category' : locale === 'fil' ? 'Mag-browse ayon sa Kategorya' : '按分類瀏覽'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: isEn ? 'Flash News' : locale === 'fil' ? 'Flash News' : '快訊', href: `/${locale}/flashnews` },
            { name: isEn ? 'Analysis' : locale === 'fil' ? 'Mga Ulat' : '分析', href: `/${locale}/analysis` },
            { name: isEn ? 'Market Data' : locale === 'fil' ? 'Merkado' : '行情', href: `/${locale}/market` },
            { name: isEn ? 'Trending' : locale === 'fil' ? 'Trending' : '趨勢', href: `/${locale}/trending` },
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
