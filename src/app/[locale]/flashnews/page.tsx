import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { FlashFeed } from '@/components/FlashFeed';
import { Sidebar } from '@/components/Sidebar';
import { getFlashItems } from '@/lib/mock-data';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale as Locale);
  return {
    title: `${dict.nav[1]} | HashSpring`,
    description: params.locale === 'en'
      ? 'Real-time crypto flash news, breaking updates, and market-moving events.'
      : '即時加密貨幣快訊、突發新聞，以及影響市場的重大事件。',
  };
}

export default async function FlashNewsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const items = getFlashItems(locale);
  const isEn = locale === 'en';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
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
          <FlashFeed items={items} locale={params.locale} adLabel={dict.adLabel} />
          <button className="w-full mt-4 py-3 rounded-lg border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            {isEn ? 'Load More' : '載入更多'}
          </button>
        </div>
        <Sidebar dict={dict} />
      </div>
    </div>
  );
}
