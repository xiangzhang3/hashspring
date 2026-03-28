import { getDictionary } from '@/lib/i18n';
import { getFlashItems } from '@/lib/mock-data';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

const CATEGORIES: Record<string, { en: string; zh: string }> = {
  btc: { en: 'Bitcoin', zh: '比特幣' },
  eth: { en: 'Ethereum', zh: '以太坊' },
  defi: { en: 'DeFi', zh: 'DeFi' },
  nft: { en: 'NFT', zh: 'NFT' },
  l2: { en: 'Layer 2', zh: 'Layer 2' },
  policy: { en: 'Policy & Regulation', zh: '政策與監管' },
  sol: { en: 'Solana', zh: 'Solana' },
  stable: { en: 'Stablecoins', zh: '穩定幣' },
  exchange: { en: 'Exchange', zh: '交易所' },
  ai: { en: 'AI & Crypto', zh: 'AI 與加密' },
};

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }) {
  const cat = CATEGORIES[params.slug];
  const name = cat ? (params.locale === 'en' ? cat.en : cat.zh) : params.slug;
  return {
    title: `${name} | HashSpring`,
    description: params.locale === 'en'
      ? `Latest ${name} news, analysis and updates on HashSpring.`
      : `HashSpring 上最新的${name}新聞、分析和動態。`,
  };
}

export default async function CategoryPage({ params }: { params: { locale: string; slug: string } }) {
  const dict = await getDictionary(params.locale);
  const isEn = params.locale === 'en';
  const cat = CATEGORIES[params.slug];
  const catName = cat ? (isEn ? cat.en : cat.zh) : params.slug;
  const allItems = getFlashItems(params.locale);

  // Filter by category (case-insensitive match)
  const filtered = allItems.filter(
    (item) => item.category.toLowerCase() === params.slug.toLowerCase() ||
    item.category.toLowerCase().includes(params.slug.toLowerCase())
  );

  const items = filtered.length > 0 ? filtered : allItems;
  const allCategories = Object.entries(CATEGORIES);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <Link href={`/${params.locale}`} className="hover:text-blue-500">{isEn ? 'Home' : '首頁'}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{catName}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{catName}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn ? `Latest ${catName} news and updates` : `最新${catName}新聞和動態`}
        </p>
      </div>

      {/* Category Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {allCategories.map(([slug, names]) => (
          <Link
            key={slug}
            href={`/${params.locale}/category/${slug}`}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              slug === params.slug
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-blue-500/30'
            }`}
          >
            {isEn ? names.en : names.zh}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-3">
          {items.map((item) => {
            const dotColor = item.level === 'red' ? 'bg-red-500' : item.level === 'orange' ? 'bg-orange-500' : 'bg-blue-500';
            return (
              <Link key={item.id} href={`/${params.locale}/flash/${item.id}`} className="block group">
                <div className="flex gap-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-blue-500/30 transition-colors">
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{item.category}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{item.time}</span>
                    </div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-[var(--text-secondary)] py-8">
              {isEn ? 'No articles in this category yet. Showing all news.' : '此分類暫無文章，顯示全部新聞。'}
            </p>
          )}
        </div>

        <Sidebar dict={dict} />
      </div>
    </div>
  );
}
