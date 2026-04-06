import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { LBankAdInFeed } from './LBankAd';

export interface FlashItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  description?: string;
  body?: string;
  analysis?: string;
  comment?: string;
  category: string;
  source?: string;
  link?: string;
  published_at?: string;
}

// Level configuration — color-coded importance system
const levelConfig = {
  red: {
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    badge: 'bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400',
    label: { en: 'BREAKING', zh: '突發' },
    border: 'border-red-500/20 dark:border-red-500/15',
  },
  orange: {
    dot: 'bg-orange-500',
    glow: '',
    badge: 'bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
    label: { en: 'IMPORTANT', zh: '重要' },
    border: 'border-orange-500/20 dark:border-orange-500/15',
  },
  blue: {
    dot: 'bg-blue-500',
    glow: '',
    badge: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400',
    label: null,
    border: 'border-transparent dark:border-[#1e293b]',
  },
};

// ── Analysis content detection (client-side) ──
const ANALYSIS_TITLE_RE = /analysis|report|research|outlook|forecast|prediction|deep dive|breakdown|explained|thesis|macro|cycle|on-chain|metrics|indicator|sentiment|trend|bull case|bear case|market structure|weekly review|monthly report|quarterly|whale activity|technical analysis|price target|分析|研报|研究|深度|展望|预测|观点|报告|趋势|周报|月报|指标|链上数据|市场结构|技术分析|宏观|周期|复盘|解读|洞察/i;
const ANALYSIS_SOURCE_RE = /messari|nansen|artemis|cryptoquant|bankless|glassnode|delphi|intotheblock|chainalysis/i;

export function isAnalysisItem(item: FlashItem): boolean {
  if (item.category === 'Analysis') return true;
  if (item.source && ANALYSIS_SOURCE_RE.test(item.source)) return true;
  const title = item.title || '';
  return ANALYSIS_TITLE_RE.test(title);
}

// ── Extract keywords from title for internal linking ──
function extractInternalLinks(title: string, locale: Locale): Array<{ text: string; href: string }> {
  const links: Array<{ text: string; href: string }> = [];
  const keywords: Record<string, string> = {
    'Bitcoin': 'bitcoin', 'BTC': 'bitcoin',
    'Ethereum': 'ethereum', 'ETH': 'ethereum',
    'Solana': 'solana', 'SOL': 'solana',
    'DeFi': 'defi', 'NFT': 'nft',
    'Binance': 'exchange', 'Coinbase': 'exchange', 'OKX': 'exchange',
    'SEC': 'regulation',
  };
  for (const [keyword, slug] of Object.entries(keywords)) {
    if (title.includes(keyword)) {
      links.push({ text: keyword, href: `/${locale}/category/${slug}` });
      if (links.length >= 2) break;
    }
  }
  return links;
}

export function FlashFeed({
  items,
  locale,
  adLabel,
}: {
  items: FlashItem[];
  locale: Locale;
  adLabel: string;
}) {
  const isZh = locale === 'zh';

  return (
    <div>
      {items.map((item, i) => {
        const lc = levelConfig[item.level] || levelConfig.blue;
        const href = `/${locale}/flash/${encodeURIComponent(item.id)}`;
        const internalLinks = extractInternalLinks(item.title, locale);
        const isFirst = i === 0;
        const showLevelBadge = item.level === 'red' || item.level === 'orange';
        const isAnalysis = isAnalysisItem(item);

        return (
          <div key={item.id}>
            <div className="flex gap-0 relative">
              {/* ── Time Column ── */}
              <div className="w-[96px] flex-shrink-0 text-right pr-3 pt-[18px]">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tabular-nums">
                  {item.time}
                </span>
              </div>

              {/* ── Timeline Axis ── */}
              <div className="w-6 flex flex-col items-center flex-shrink-0">
                {/* Dot — analysis uses a special purple dot */}
                <div className={`mt-[20px] w-[11px] h-[11px] rounded-full flex-shrink-0 z-10 transition-all ${
                  isAnalysis ? 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]' : `${lc.dot} ${isFirst ? lc.glow : ''}`
                }`} />
                {/* Vertical line */}
                <div className="w-px flex-1 bg-gray-200 dark:bg-[#1e293b]" />
              </div>

              {/* ── Card Content ── */}
              <Link href={href} prefetch={false} className="flex-1 no-underline group">
                {isAnalysis ? (
                  /* ━━━ ANALYSIS CARD — larger, prominent style ━━━ */
                  <div className="my-1.5 mx-1 p-4 sm:p-5 rounded-xl border transition-all duration-200
                    bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-[#111827]
                    border-purple-200/60 dark:border-purple-800/40
                    hover:from-purple-50 hover:to-purple-50/30 dark:hover:from-purple-950/30 dark:hover:to-[#1e293b]
                    hover:border-purple-300 dark:hover:border-purple-700/60
                    hover:shadow-md hover:shadow-purple-500/5 dark:hover:shadow-none
                  ">
                    {/* Top row: Analysis badge + category + source */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.8px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {isZh ? '分析' : 'ANALYSIS'}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${levelConfig[item.level]?.badge || levelConfig.blue.badge}`}>
                        {item.category}
                      </span>
                      {item.source && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          via {item.source}
                        </span>
                      )}
                    </div>

                    {/* Large Title */}
                    <h3 className="text-lg sm:text-[19px] font-bold leading-snug text-gray-900 dark:text-gray-100 tracking-tight line-clamp-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {item.title}
                    </h3>

                    {/* Description — more visible for analysis */}
                    {item.description && (
                      <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-3">
                        {item.description}
                      </p>
                    )}

                    {/* AI Analysis insight */}
                    {item.analysis && (
                      <div className="mt-3 p-2.5 rounded-lg bg-purple-50/80 dark:bg-purple-900/15 border border-purple-100 dark:border-purple-800/30">
                        <p className="text-[12px] leading-relaxed text-purple-700 dark:text-purple-300 flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="line-clamp-2">{item.analysis}</span>
                        </p>
                      </div>
                    )}

                    {/* Bottom: read more + tags */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-100/60 dark:border-purple-800/30">
                      <span className="text-xs font-semibold text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors flex items-center gap-1">
                        {isZh ? '閱讀全文' : 'Read full analysis'}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                      {internalLinks.length > 0 && (
                        <div className="flex items-center gap-2">
                          {internalLinks.map((il) => (
                            <span key={il.href} className="text-[10px] text-purple-400 dark:text-purple-500">
                              #{il.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ━━━ REGULAR FLASH CARD ━━━ */
                  <div className={`my-1.5 mx-1 p-3.5 rounded-xl border transition-all duration-200
                    bg-white dark:bg-[#111827]
                    ${lc.border}
                    hover:bg-gray-50 dark:hover:bg-[#1e293b]
                    hover:border-gray-300 dark:hover:border-[#334155]
                    hover:shadow-sm dark:hover:shadow-none
                  `}>
                    {/* Top row: level badge + category + source */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {showLevelBadge && lc.label && (
                        <span className={`text-[10px] font-bold tracking-[0.8px] px-1.5 py-0.5 rounded ${lc.badge}`}>
                          {isZh ? lc.label.zh : lc.label.en}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${levelConfig[item.level]?.badge || levelConfig.blue.badge}`}>
                        {item.category}
                      </span>
                      {item.source && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          via {item.source}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-[17px] font-bold leading-snug text-gray-900 dark:text-gray-100 tracking-tight line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="mt-1.5 text-[13px] sm:text-sm leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* AI Analysis preview */}
                    {item.analysis && (
                      <p className="mt-2 text-[11px] leading-relaxed text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <svg className="w-3 h-3 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="line-clamp-1">{item.analysis}</span>
                      </p>
                    )}

                    {/* Bottom row: tags */}
                    {internalLinks.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                        {internalLinks.map((il) => (
                          <span
                            key={il.href}
                            className="text-[10px] text-blue-500 dark:text-blue-400"
                          >
                            #{il.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </div>

            {/* In-Feed Ad */}
            {i === 0 && adLabel && (
              <LBankAdInFeed label={adLabel} locale={locale} />
            )}
          </div>
        );
      })}
    </div>
  );
}
