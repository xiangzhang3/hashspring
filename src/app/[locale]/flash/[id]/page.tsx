import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { LogoBadge } from '@/components/Logo';
import { FlashFeed } from '@/components/FlashFeed';
import { MarketWidget } from '@/components/MarketWidget';
import { getFlashItems } from '@/lib/mock-data';

const articleEn = {
  title: 'Bitcoin surges past $95,000 as institutional inflows hit record $2.1B in single day',
  date: 'March 28, 2026 · 14:32 UTC',
  timeAgo: '2 minutes ago',
  category: 'Bitcoin',
  author: 'HashSpring Market Desk',
  source: 'HashSpring Market Desk',
  tags: ['Bitcoin', 'BTC', 'ETF', 'Institutional', 'ATH', 'BlackRock'],
  paragraphs: [
    'Bitcoin has broken through the $95,000 resistance level for the first time, reaching a new all-time high of $95,234 during Asian trading hours on Friday. The surge was driven by unprecedented institutional demand, with spot Bitcoin ETFs recording a combined net inflow of $2.1 billion in a single trading day.',
    "BlackRock\u2019s iShares Bitcoin Trust (IBIT) led the charge with $890 million in inflows, followed by Fidelity\u2019s Wise Origin Bitcoin Fund (FBTC) at $520 million. The remaining inflows were distributed across other approved ETF products.",
    'Market analysts attribute the rally to a combination of factors: the approaching Bitcoin halving cycle effects, growing institutional adoption, and favorable macroeconomic conditions with the Federal Reserve signaling potential rate cuts in Q2 2026.',
    'On-chain data from Glassnode shows that long-term holders continue to accumulate, with wallets holding BTC for more than 1 year reaching a new high of 14.2 million BTC, representing approximately 72% of the total circulating supply.',
  ],
  prevTitle: 'SEC approves first spot Ethereum ETF options trading',
  nextTitle: 'Uniswap v4 launches with hook-based customization',
};

const articleZh = {
  title: '比特币突破 95,000 美元，机构单日流入创纪录达 21 亿美元',
  date: '2026年3月28日 · 14:32 UTC',
  timeAgo: '2 分钟前',
  category: '比特币',
  author: 'HashSpring 行情编辑部',
  source: 'HashSpring 行情编辑部',
  tags: ['比特币', 'BTC', 'ETF', '机构资金', '历史新高', '贝莱德'],
  paragraphs: [
    '比特币在周五亚洲早盘交易时段突破 95,000 美元关口，创下 95,234 美元的历史新高。此次上涨由前所未有的机构需求驱动，现货比特币 ETF 单日净流入合计达 21 亿美元。',
    '贝莱德 iShares 比特币信托（IBIT）以 8.9 亿美元的流入领跑，富达的 Wise Origin 比特币基金（FBTC）以 5.2 亿美元紧随其后。其余流入分布在其他已获批的 ETF 产品中。',
    '市场分析师将此次上涨归因于多个因素：即将到来的比特币减半周期效应、机构采用的增长，以及美联储暗示 2026 年第二季度可能降息带来的有利宏观经济环境。',
    'Glassnode 的链上数据显示，长期持有者持续积累，持有 BTC 超过 1 年的钱包达到 1420 万枚 BTC 的新高，约占总流通供应量的 72%。',
  ],
  prevTitle: 'SEC 批准首个现货以太坊 ETF 期权交易',
  nextTitle: 'Uniswap v4 上线，支持 Hook 自定义',
};

export async function generateMetadata({ params }: { params: { locale: string; id: string } }): Promise<Metadata> {
  const article = params.locale === 'zh' ? articleZh : articleEn;
  return {
    title: `${article.title} | HashSpring`,
    description: article.paragraphs[0].slice(0, 160),
    openGraph: {
      title: article.title,
      description: article.paragraphs[0].slice(0, 160),
      type: 'article',
    },
  };
}

export default async function FlashDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const article = locale === 'zh' ? articleZh : articleEn;
  const relatedItems = getFlashItems(locale).slice(1, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: '2026-03-28T14:32:00Z',
    author: { '@type': 'Organization', name: 'HashSpring' },
    publisher: { '@type': 'Organization', name: 'HashSpring', url: 'https://hashspring.com' },
    description: article.paragraphs[0],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-5 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <a href={`/${locale}`} className="text-gray-400 no-underline hover:text-gray-600">{dict.home}</a>
          <span>/</span>
          <a href={`/${locale}`} className="text-[#0066FF] no-underline">{dict.flash}</a>
          <span>/</span>
          <span className="text-gray-500">{article.category}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-6 grid grid-cols-[1fr_340px] gap-10">

        {/* LEFT: Article */}
        <article>
          {/* Badge + Category + Time */}
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-red-500 text-white text-[11px] font-extrabold px-3 py-1 rounded">
              {dict.breakingTag}
            </span>
            <span className="text-sm text-gray-500 font-medium">{article.category}</span>
            <span className="text-sm text-gray-400">{article.timeAgo}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold leading-snug tracking-tight mb-6 max-w-[660px]">
            {article.title}
          </h1>

          {/* Author + Share row */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <LogoBadge size={36} />
              <div>
                <div className="text-sm font-bold">{article.author}</div>
                <div className="text-xs text-gray-400">{article.date}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 mr-1">{dict.share}:</span>
              {['X', 'Telegram', 'Reddit', 'Copy Link'].map((btn) => (
                <button
                  key={btn}
                  className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Article body */}
          <div className="max-w-[660px] mb-8">
            {article.paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.9] text-gray-700 dark:text-gray-300 mb-6">
                {p}
              </p>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8 max-w-[660px]">
            {article.tags.map((tag) => (
              <a key={tag} href="#" className="text-xs font-medium text-[#0066FF] bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full no-underline hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30">
                #{tag}
              </a>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6 mb-8">
            <a href="#" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="text-[11px] font-semibold text-gray-400 mb-2">← {dict.prevLabel}</div>
              <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200">{article.prevTitle}</div>
            </a>
            <a href="#" className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 no-underline text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="text-[11px] font-semibold text-gray-400 mb-2">{dict.nextLabel} →</div>
              <div className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200">{article.nextTitle}</div>
            </a>
          </div>

          {/* Related FlashNews */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-800 dark:border-gray-200">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-lg font-extrabold tracking-tight">
                {locale === 'zh' ? '相关快讯' : 'Related FlashNews'}
              </h2>
            </div>
            <FlashFeed items={relatedItems} locale={locale} adLabel={dict.adLabel} />
          </div>
        </article>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col gap-6">
          <div className="sticky top-20 flex flex-col gap-6">
            {/* Ad */}
            <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg h-[250px] flex items-center justify-center relative">
              <span className="absolute top-2 right-3 text-[10px] text-gray-400">{dict.adLabel}</span>
              <span className="text-gray-400 text-xs">Advertisement – 300x250</span>
            </div>

            {/* Market */}
            <MarketWidget dict={dict} />

            {/* Newsletter */}
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h3 className="text-base font-bold mb-1">{dict.sectionNewsletter}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{dict.newsletterDesc}</p>
              <input placeholder={dict.emailPh} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm mb-2 outline-none focus:border-[#0066FF]" />
              <button className="w-full px-4 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD]">{dict.subscribeCta}</button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
