import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import TrendingTable from '@/components/TrendingTable';
import { Sidebar } from '@/components/Sidebar';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const isEn = locale === 'en';
  const title = isEn ? 'Hot Tokens Ranking | HashSpring' : '热门Token排行榜 | HashSpring';
  const description = isEn
    ? 'Real-time cryptocurrency heat ranking based on OKX trading volume and price momentum. Find the hottest tokens right now.'
    : '基于OKX实时成交量与价格动能的加密货币热度排行。快速发现当前最热门的Token。';
  return {
    title,
    description,
    alternates: {
      canonical: `https://www.hashspring.com/${locale}/trending`,
      languages: {
        en: '/en/trending',
        zh: '/zh/trending',
        'x-default': '/en/trending',
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://www.hashspring.com/${locale}/trending`,
      siteName: 'HashSpring',
    },
  };
}

export default async function TrendingPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: isEn ? 'Hot Tokens Ranking' : '热门Token排行榜',
            url: `https://www.hashspring.com/${locale}/trending`,
            description: isEn
              ? 'Real-time crypto heat ranking powered by OKX data.'
              : '基于OKX实时数据的加密货币热度排行。',
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://www.hashspring.com' },
          }),
        }}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          🔥 {isEn ? 'Hot Tokens Ranking' : '热门Token排行榜'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Real-time heat ranking based on 24h trading volume and price momentum from OKX'
            : '基于OKX 24小时成交量与价格动能的实时热度排行，每60秒自动刷新'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main */}
        <TrendingTable locale={locale} />

        {/* Sidebar */}
        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
