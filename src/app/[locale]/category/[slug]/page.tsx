import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const CATEGORIES: Record<string, { en: string; zh: string }> = {
  btc: { en: 'Bitcoin', zh: '比特幣' },
  eth: { en: 'Ethereum', zh: '以太坊' },
  defi: { en: 'DeFi', zh: 'DeFi' },
  nft: { en: 'NFT', zh: 'NFT' },
  l2: { en: 'Layer 2', zh: 'Layer 2' },
  policy: { en: 'Policy & Regulation', zh: '政策與監管' },
  regulation: { en: 'Regulation', zh: '監管' },
  sol: { en: 'Solana', zh: 'Solana' },
  stable: { en: 'Stablecoins', zh: '穩定幣' },
  exchange: { en: 'Exchange', zh: '交易所' },
  ai: { en: 'AI & Crypto', zh: 'AI 與加密' },
  meme: { en: 'Meme', zh: 'Meme' },
  rwa: { en: 'RWA', zh: 'RWA' },
  gaming: { en: 'Gaming', zh: '遊戲' },
  crypto: { en: 'Crypto', zh: '加密貨幣' },
};

function getCategoryMatches(slug: string): string[] {
  const map: Record<string, string[]> = {
    btc: ['BTC', 'Bitcoin'], eth: ['ETH', 'Ethereum'], defi: ['DeFi', 'DEFI'],
    nft: ['NFT'], l2: ['L2', 'Layer 2'], policy: ['Policy', 'Regulation'],
    regulation: ['Regulation', 'Policy'], sol: ['SOL', 'Solana'],
    stable: ['Stable', 'Stablecoin'], exchange: ['Exchange'],
    ai: ['AI'], meme: ['Meme', 'MEME'], rwa: ['RWA'], gaming: ['Gaming', 'GameFi'],
    crypto: ['Crypto'],
  };
  return map[slug.toLowerCase()] || [slug];
}

async function getCategoryItems(slug: string, locale: string) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];
    const matches = getCategoryMatches(slug);
    const orFilter = matches.map(m => `category.ilike.${m}`).join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash,title_en,title_zh,category,level,pub_date,source&or=(${orFilter})&order=pub_date.desc&limit=50`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 120 } }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any) => {
      const title = locale === 'zh' ? (r.title_zh || r.title_en) : (r.title_en || r.title_zh);
      const sl = (r.title_en || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
      const sh = r.content_hash.replace(/^h/, '').slice(0, 8);
      const seoSlug = sl ? `${sl}-${sh}` : r.content_hash;
      const diff = Date.now() - new Date(r.pub_date).getTime();
      const mins = Math.floor(diff / 60000);
      const time = mins < 60
        ? (locale === 'zh' ? `${mins}分鐘` : `${mins}m`)
        : mins < 1440
          ? (locale === 'zh' ? `${Math.floor(mins / 60)}小時` : `${Math.floor(mins / 60)}h`)
          : (locale === 'zh' ? `${Math.floor(mins / 1440)}天` : `${Math.floor(mins / 1440)}d`);
      return { id: seoSlug, title, category: r.category || 'Crypto', level: r.level || 'blue', time, source: r.source || '' };
    });
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }) {
  const cat = CATEGORIES[params.slug];
  const name = cat ? (params.locale === 'en' ? cat.en : cat.zh) : params.slug;
  return {
    title: `${name} | HashSpring`,
    description: params.locale === 'en'
      ? `Latest ${name} news, analysis and updates on HashSpring.`
      : `HashSpring 上最新的${name}新聞、分析和動態。`,
    alternates: {
      canonical: `https://www.hashspring.com/${params.locale}/category/${params.slug}`,
      languages: { en: `https://www.hashspring.com/en/category/${params.slug}`, zh: `https://www.hashspring.com/zh/category/${params.slug}` },
    },
    openGraph: {
      title: `${name} | HashSpring`,
      description: params.locale === 'en'
        ? `Latest ${name} news, analysis and updates.`
        : `最新的${name}新聞、分析和動態。`,
      type: 'website',
      url: `https://www.hashspring.com/${params.locale}/category/${params.slug}`,
      siteName: 'HashSpring',
    },
  };
}

export default async function CategoryPage({ params }: { params: { locale: string; slug: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';
  const cat = CATEGORIES[params.slug];
  const catName = cat ? (isEn ? cat.en : cat.zh) : params.slug;
  const items = await getCategoryItems(params.slug, locale);
  const allCategories = Object.entries(CATEGORIES).filter(([k]) => !['regulation', 'crypto'].includes(k));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: catName,
            url: `https://www.hashspring.com/${locale}/category/${params.slug}`,
            description: isEn ? `Latest ${catName} crypto news` : `最新${catName}加密貨幣新聞`,
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://www.hashspring.com' },
          }),
        }}
      />

      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <Link href={`/${locale}`} className="hover:text-blue-500">{isEn ? 'Home' : '首頁'}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{catName}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{catName}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn ? `Latest ${catName} news and updates` : `最新${catName}新聞和動態`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {allCategories.map(([slug, names]) => (
          <Link
            key={slug}
            href={`/${locale}/category/${slug}`}
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
          {items.length > 0 ? items.map((item: any) => {
            const dotColor = item.level === 'red' ? 'bg-red-500' : item.level === 'orange' ? 'bg-orange-500' : 'bg-blue-500';
            return (
              <Link key={item.id} href={`/${locale}/flash/${item.id}`} className="block group">
                <div className="flex gap-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-blue-500/30 transition-colors">
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded">{item.category}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{item.time}</span>
                      {item.source && <span className="text-xs text-[var(--text-secondary)]">· {item.source}</span>}
                    </div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          }) : (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <p className="text-lg mb-2">{isEn ? 'No articles yet' : '暫無文章'}</p>
              <p className="text-sm">{isEn ? 'Check back soon for the latest updates.' : '請稍後再來查看最新動態。'}</p>
              <Link href={`/${locale}/flashnews`} className="text-blue-500 text-sm mt-4 inline-block hover:underline">
                {isEn ? 'View all flash news →' : '查看全部快訊 →'}
              </Link>
            </div>
          )}
        </div>
        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
