import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { getFlashItems } from '@/lib/mock-data';
import LiveFlashFeed from '@/components/LiveFlashFeed';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const dict = await getDictionary(params.locale as Locale);
  const title = `${dict.brand} — ${dict.sub}`;
  const description = dict.footerAbout;
  return {
    title,
    description,
    alternates: {
      canonical: `https://hashspring.com/${params.locale}`,
      languages: { en: '/en', zh: '/zh' },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://hashspring.com/${params.locale}`,
      siteName: 'HashSpring',
    },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  // Try to fetch from API server-side, fallback to mock data
  let initialItems = getFlashItems(locale);

  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const apiUrl = `${protocol}://${host}/api/flash-news?locale=${locale}`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        'User-Agent': 'HashSpring/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        initialItems = data;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch flash news from API, using mock data:', error);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
      {/* JSON-LD structured data for homepage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'HashSpring',
            url: `https://hashspring.com/${locale}`,
            description: dict.footerAbout,
            inLanguage: locale === 'zh' ? 'zh-Hans' : 'en',
            publisher: {
              '@type': 'Organization',
              name: 'HashSpring',
              url: 'https://hashspring.com',
              logo: {
                '@type': 'ImageObject',
                url: 'https://hashspring.com/logo.png',
              },
            },
            potentialAction: {
              '@type': 'SearchAction',
              target: `https://hashspring.com/${locale}/flashnews?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      {/* SEO: visually hidden h1 for homepage */}
      <h1 className="sr-only">{dict.brand} — {dict.sub}</h1>

      {/* LEFT: Live Flash Feed */}
      <div>
        {/* Section header — telegraph style */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-800 dark:border-gray-200">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight">{dict.sectionFlash}</h2>
            <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded tracking-wider uppercase">LIVE</span>
          </div>
          <a href={`/${locale}/flashnews`} className="text-sm text-[#0066FF] font-semibold no-underline hover:underline">
            {dict.viewAll} →
          </a>
        </div>

        {/* Live Flash Feed with auto-refresh + category filters */}
        <LiveFlashFeed
          initialItems={initialItems}
          locale={locale}
          adLabel={dict.adLabel}
        />
      </div>

      {/* RIGHT SIDEBAR */}
      <Sidebar dict={dict} locale={locale} />
    </div>
  );
}
