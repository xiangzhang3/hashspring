import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { FlashFeed } from '@/components/FlashFeed';
import { Sidebar } from '@/components/Sidebar';
import { getFlashItems } from '@/lib/mock-data';

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
  const flashItems = getFlashItems(locale);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-[1fr_340px] gap-8">

      {/* LEFT: Flash Feed */}
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-800 dark:border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-extrabold tracking-tight">{dict.sectionFlash}</h2>
          </div>
          <a href="#" className="text-sm text-[#0066FF] font-semibold no-underline hover:underline">
            {dict.viewAll} →
          </a>
        </div>

        {/* Flash items */}
        <FlashFeed items={flashItems} locale={locale} adLabel={dict.adLabel} />

        {/* Load more */}
        <div className="text-center mt-8">
          <button className="px-8 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[#0066FF] text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {dict.loadMore}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <Sidebar dict={dict} />
    </div>
  );
}
