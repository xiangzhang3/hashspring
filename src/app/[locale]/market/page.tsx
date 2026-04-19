import dynamic from 'next/dynamic';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';

const MarketTable = dynamic(() => import('@/components/MarketTable'), { ssr: false });
const TrendingCoins = dynamic(() => import('@/components/TrendingCoins'), { ssr: false });
const MarketOverview = dynamic(() => import('@/components/MarketOverview'), { ssr: false });

export async function generateMetadata({ params }: { params: { locale: string } }) {
  try {
    const locale = params.locale as Locale;
    const dict = await getDictionary(locale);
    const marketTitle = dict.nav[4] || (locale === 'en' ? 'Market' : '行情');
    const description = locale === 'en'
      ? 'Real-time cryptocurrency market data, prices, trends and analysis from CoinGecko.'
      : '即時加密貨幣行情數據、價格、趨勢與分析，數據來源 CoinGecko。';
    return {
      title: `${marketTitle} | HashSpring`,
      description,
      alternates: {
        canonical: `https://www.hashspring.com/${locale}/market`,
        languages: { en: '/en/market', zh: '/zh/market', 'x-default': '/en/market' },
      },
      openGraph: {
        title: `${marketTitle} | HashSpring`,
        description,
        type: 'website',
        url: `https://www.hashspring.com/${locale}/market`,
        siteName: 'HashSpring',
        images: [{ url: 'https://www.hashspring.com/og-image.png', width: 1200, height: 630, alt: 'HashSpring Market' }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@hashspring',
        title: `${marketTitle} | HashSpring`,
        description,
      },
      robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large' as const,
      },
    };
  } catch {
    return {
      title: 'Market | HashSpring',
      description: 'Real-time cryptocurrency market data, prices, trends and analysis.',
    };
  }
}

export default async function MarketPage({ params }: { params: { locale: string } }) {
  let locale: Locale = 'en';
  let dict;
  let isEn = true;
  const isFil = params.locale === 'fil';

  try {
    locale = (params.locale || 'en') as Locale;
    dict = await getDictionary(locale);
    isEn = locale === 'en';
  } catch (e) {
    console.error('[MarketPage] getDictionary failed:', e);
    // Use a minimal fallback dict to prevent crash
    dict = await getDictionary('en');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: isEn ? 'Cryptocurrency Market Data' : isFil ? 'Cryptocurrency Market Data' : '加密貨幣行情數據',
            url: `https://www.hashspring.com/${locale}/market`,
            description: isEn
              ? 'Real-time cryptocurrency market data, prices, trends and analysis.'
              : '即時加密貨幣行情數據、價格、趨勢與分析。',
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://www.hashspring.com' },
          }),
        }}
      />
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'Cryptocurrency Market' : isFil ? 'Cryptocurrency Market' : '加密貨幣行情'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Real-time prices, market cap, volume and trends powered by CoinGecko'
            : isFil
              ? 'Real-time prices, market cap, volume and trends powered by CoinGecko'
              : '即時價格、市值、成交量與趨勢，數據來源 CoinGecko'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Market Overview Cards — live data from API */}
          <MarketOverview locale={locale} />

          {/* Full Market Table */}
          <MarketTable locale={locale} />

          {/* Trending Section */}
          <TrendingCoins locale={locale} />
        </div>

        {/* Sidebar */}
        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}

