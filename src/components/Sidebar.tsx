import Link from 'next/link';
import { MarketWidget } from './MarketWidget';
import { LBankAd300x250, LBankAd300x250Alt } from './LBankAd';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function Sidebar({ dict, locale = 'en' }: { dict: Dictionary; locale?: Locale }) {
  return (
    <aside className="flex flex-col gap-6">
      {/* Ad 300x250 — LBank x Argentina #1 */}
      <LBankAd300x250 label={dict.adLabel} />

      {/* Market Widget */}
      <MarketWidget dict={dict} />

      {/* Newsletter */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-base font-bold mb-1">{dict.sectionNewsletter}</h3>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{dict.newsletterDesc}</p>
        <div className="flex flex-col gap-2">
          <input
            placeholder={dict.emailPh}
            className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none focus:border-[#0066FF]"
          />
          <button className="px-4 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD] transition-colors">
            {dict.subscribeCta}
          </button>
        </div>
      </div>

      {/* Trending */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-bold mb-3">{dict.sectionTrending}</h3>
        <div className="flex flex-wrap gap-2">
          {dict.trending.map((tag) => (
            <Link key={tag} href={`/${locale}/flashnews?q=${encodeURIComponent(tag)}`} className="text-xs font-medium text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Ad 300x250 #2 — LBank x Argentina (alt promo) */}
      <LBankAd300x250Alt label={dict.adLabel} />
    </aside>
  );
}
