import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import LiveFlashFeed from '@/components/LiveFlashFeed';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const description = locale === 'en'
    ? 'Real-time crypto flash news, breaking updates, and market-moving events.'
    : '即時加密貨幣快訊、突發新聞，以及影響市場的重大事件。';
  return {
    title: `${dict.nav[1]} | HashSpring`,
    description,
    alternates: {
      canonical: `https://hashspring.com/${locale}/flashnews`,
      languages: { en: '/en/flashnews', zh: '/zh/flashnews' },
    },
    openGraph: {
      title: `${dict.nav[1]} | HashSpring`,
      description,
      type: 'website',
      url: `https://hashspring.com/${locale}/flashnews`,
      siteName: 'HashSpring',
    },
  };
}

export default async function FlashNewsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const isEn = locale === 'en';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: isEn ? 'Crypto Flash News' : '加密貨幣快訊',
            url: `https://hashspring.com/${locale}/flashnews`,
            description: isEn
              ? 'Real-time crypto flash news, breaking updates, and market-moving events.'
              : '即時加密貨幣快訊、突發新聞，以及影響市場的重大事件。',
            isPartOf: { '@type': 'WebSite', name: 'HashSpring', url: 'https://hashspring.com' },
          }),
        }}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'FlashNews' : '快訊'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Real-time crypto news and breaking updates, 24/7'
            : '24/7 即時加密貨幣快訊與突發動態'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          {/* Use LiveFlashFeed to auto-fetch real data on mount */}
          <LiveFlashFeed
            initialItems={[]}
            locale={locale}
            adLabel={dict.adLabel}
          />
        </div>
        <Sidebar dict={dict} locale={locale} />
      </div>
    </div>
  );
}
