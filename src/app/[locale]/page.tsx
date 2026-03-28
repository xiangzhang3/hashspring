import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { getFlashItems } from '@/lib/mock-data';
import LiveFlashFeed from '@/components/LiveFlashFeed';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const dict = await getDictionary(params.locale as Locale);
  return {
    title: `${dict.brand} — ${dict.sub}`,
    description: dict.footerAbout,
    alternates: {
      canonical: `https://hashspring.com/${params.locale}`,
      languages: { en: '/en', zh: '/zh' },
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
      <Sidebar dict={dict} />
    </div>
  );
}
