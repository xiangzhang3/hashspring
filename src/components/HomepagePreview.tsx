import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

type Variant = 'a' | 'b';

const pulse = [
  { level: 'BREAKING', titleEn: 'Bitcoin decision window nears as resistance compresses', titleZh: '比特币接近关键决策窗口，阻力区持续收敛', timeEn: '3m ago', timeZh: '3分钟前' },
  { level: 'IMPORTANT', titleEn: 'Solana liquidity stress spreads after exploit fallout', titleZh: '漏洞余波扩散，Solana 流动性压力上升', timeEn: '8m ago', timeZh: '8分钟前' },
  { level: 'FLASH', titleEn: 'Stablecoin rails expand as regulators sharpen language', titleZh: '稳定币支付轨道扩张，监管表述同步收紧', timeEn: '14m ago', timeZh: '14分钟前' },
  { level: 'FLASH', titleEn: 'Altcoin breadth improves but rotation remains selective', titleZh: '山寨币广度修复，但轮动仍然非常分化', timeEn: '19m ago', timeZh: '19分钟前' },
];

const features = [
  {
    tagEn: 'ANALYSIS',
    tagZh: '分析',
    titleEn: 'ETF flows are no longer the whole story in this cycle',
    titleZh: '这一轮周期里，ETF 资金流已经不再是全部叙事',
    descEn: 'Institutional inflows still matter, but the market is starting to trade on policy timing, stablecoin expansion, and cross-border liquidity.',
    descZh: '机构资金仍然重要，但市场开始更多交易政策时点、稳定币扩张与跨境流动性变化。',
  },
  {
    tagEn: 'RESEARCH',
    tagZh: '研究',
    titleEn: 'Stablecoins are becoming the new distribution layer for crypto',
    titleZh: '稳定币正在成为加密行业新的分发层',
    descEn: 'The next competitive battleground may be payments, remittance, and treasury settlement rather than pure exchange volume.',
    descZh: '下一轮竞争可能不再只是交易量，而是支付、汇款与资金结算能力。',
  },
  {
    tagEn: 'MARKET',
    tagZh: '市场',
    titleEn: 'Why altcoins still fail to capture broad risk appetite',
    titleZh: '为什么山寨币仍然没有真正接住广泛风险偏好',
    descEn: 'Breadth has improved, but capital allocation is still concentrated in the most liquid narratives.',
    descZh: '虽然市场广度有所改善，但资金配置依然高度集中在流动性最强的叙事上。',
  },
];

function levelColor(level: string) {
  if (level === 'BREAKING') return 'bg-red-500';
  if (level === 'IMPORTANT') return 'bg-orange-500';
  return 'bg-blue-500';
}

export default function HomepagePreview({
  locale,
  variant,
}: {
  locale: Locale;
  variant: Variant;
}) {
  const isZh = locale === 'zh';
  const isA = variant === 'a';

  const copy = {
    topLabel: isA
      ? (isZh ? '方案 A / 国际金融媒体' : 'Scheme A / Global Finance Media')
      : (isZh ? '方案 B / 中文资讯媒体' : 'Scheme B / Chinese Newsroom'),
    leadTag: isA ? (isZh ? '首页焦点' : 'Front Page') : (isZh ? '焦点头条' : 'Top Story'),
    leadTitle: isA
      ? (isZh ? '先给判断，再给流量，把首页从终端感拉回媒体感' : 'Lead with judgement first, then let the live desk carry the flow')
      : (isZh ? '更热、更密、更像中文资讯媒体首页的节奏' : 'Higher density, faster rhythm, and a more newsroom-style front page'),
    leadDesc: isA
      ? (isZh ? '头条承担品牌与判断力，快讯承担节奏和更新。用户第一眼先知道今天最重要的是什么。' : 'The lead story carries editorial authority while the live desk handles speed. The first screen answers what matters most today.')
      : (isZh ? '首页更强调热榜、快讯、专题与头条联动，用户一进来就感到“内容很多，而且在更新”。' : 'This version pushes rankings, flash updates, and editorial clusters higher so the homepage feels busy, current, and highly active.')
  };

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-slate-950 dark:bg-[#090d14] dark:text-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {copy.topLabel}
            </p>
            <h1 className="mt-1 text-xl font-black tracking-[-0.03em]">
              {isA
                ? (isZh ? '首页视觉草图预览' : 'Homepage Visual Preview')
                : (isZh ? '首页视觉草图预览' : 'Homepage Visual Preview')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/homepage-a`} className={`rounded-full px-4 py-2 text-sm font-semibold no-underline ${isA ? 'bg-[#0066FF] text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              A
            </Link>
            <Link href={`/${locale}/homepage-b`} className={`rounded-full px-4 py-2 text-sm font-semibold no-underline ${!isA ? 'bg-[#0066FF] text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              B
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 bg-[#0b1220] px-6 py-3 text-xs text-slate-200 dark:border-slate-800">
            BTC 66,600  ETH 2,020  SOL 83.3  BNB 616  XRP 1.35  ADA 0.26
          </div>
          <div className="border-b border-slate-200 bg-[#121b2c] px-6 py-4 text-white dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-xl font-black tracking-[-0.04em]">HashSpring</div>
              <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-300">
                <span>{isZh ? '首页' : 'Home'}</span>
                <span>{isZh ? '快讯' : 'FlashNews'}</span>
                <span>{isZh ? '分析' : 'Analysis'}</span>
                <span>{isZh ? '热门' : 'Trending'}</span>
                <span>{isZh ? '行情' : 'Market'}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {isZh
              ? '热搜: BTC ETF / Solana / 稳定币 / 监管 / Meme / AI / RWA'
              : 'Trending: BTC ETF / Solana / Stablecoins / Regulation / Meme / AI / RWA'}
          </div>

          <div className="p-6 md:p-8">
            {isA ? (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_340px]">
                  <div className="rounded-[30px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_58%,#1d4ed8_100%)] p-7 text-white">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100/70">{copy.leadTag}</div>
                    <h2 className="mt-4 max-w-[12ch] text-[2.5rem] font-black leading-[0.98] tracking-[-0.05em] md:text-[4.2rem]">
                      {copy.leadTitle}
                    </h2>
                    <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-slate-200">
                      {copy.leadDesc}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3 text-xs text-blue-100/70">
                      <span>HashSpring Desk</span>
                      <span>Apr 7, 2026</span>
                      <span>{isZh ? '8 分钟阅读' : '8 min read'}</span>
                    </div>
                    <div className="mt-7 flex gap-3">
                      <span className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950">
                        {isZh ? '阅读头条' : 'Read Lead'}
                      </span>
                      <span className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">
                        {isZh ? '进入分析频道' : 'Open Analysis'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          {isZh ? '市场脉搏' : 'Market Pulse'}
                        </p>
                        <h3 className="mt-1 text-lg font-bold">{isZh ? '正在驱动市场的消息' : 'What is moving now'}</h3>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {pulse.map((item) => (
                        <div key={item.titleEn} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className={`h-2.5 w-2.5 rounded-full ${levelColor(item.level)}`} />
                            <span className="text-slate-500">{item.level}</span>
                            <span className="text-slate-400">{isZh ? item.timeZh : item.timeEn}</span>
                          </div>
                          <div className="mt-2 text-[15px] font-bold leading-6">
                            {isZh ? item.titleZh : item.titleEn}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-[-0.03em]">{isZh ? '编辑精选' : 'Editors Picks'}</h3>
                    <span className="text-sm font-semibold text-[#0066FF]">{isZh ? '更多分析' : 'More analysis'}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {features.map((item) => (
                      <div key={item.titleEn} className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0066FF]">
                          {isZh ? item.tagZh : item.tagEn}
                        </div>
                        <div className="mt-3 text-lg font-bold leading-7">
                          {isZh ? item.titleZh : item.titleEn}
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {isZh ? item.descZh : item.descEn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 border-b border-slate-200 pb-3 dark:border-slate-800">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{isZh ? '实时桌面' : 'Live Desk'}</p>
                      <h3 className="mt-1 text-xl font-black tracking-[-0.03em]">{isZh ? '完整快讯流放在主头条之后' : 'Full live feed follows the lead story'}</h3>
                    </div>
                    <div className="space-y-3">
                      {pulse.concat(pulse).map((item, idx) => (
                        <div key={`${item.titleEn}-${idx}`} className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                          {isZh ? item.titleZh : item.titleEn}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {['Market Widget', 'Fear & Greed', 'Trending Coins', 'Newsletter'].map((box) => (
                      <div key={box} className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-4 space-y-2">
                          <div className="h-3 rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0066FF]">{copy.leadTag}</div>
                      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[22px] bg-[linear-gradient(135deg,#1d4ed8_0%,#0f172a_100%)] p-6 text-white">
                          <h2 className="max-w-[14ch] text-[2rem] font-black leading-tight tracking-[-0.04em] md:text-[3rem]">
                            {copy.leadTitle}
                          </h2>
                          <p className="mt-4 max-w-[48ch] text-[15px] leading-7 text-slate-200">
                            {copy.leadDesc}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                            <div className="text-sm font-bold">{isZh ? '副头条 1' : 'Sublead 1'}</div>
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{isZh ? '稳定币叙事从交易走向支付基础设施' : 'Stablecoins move from trading utility to payment rails'}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                            <div className="text-sm font-bold">{isZh ? '副头条 2' : 'Sublead 2'}</div>
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{isZh ? '政策预期成为市场新波动来源' : 'Policy timing becomes a fresh source of volatility'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 border-b border-slate-200 pb-3 dark:border-slate-800">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {isZh ? '热门榜' : 'Top List'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {pulse.map((item, idx) => (
                        <div key={item.titleEn} className="flex gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                          <div className="text-lg font-black text-slate-300 dark:text-slate-700">{idx + 1}</div>
                          <div className="text-sm font-semibold leading-6">
                            {isZh ? item.titleZh : item.titleEn}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {['全部', 'BTC', 'ETH', '政策', '交易所', 'DeFi'].map((tab, idx) => (
                        <span key={tab} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${idx === 0 ? 'bg-[#0066FF] text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {isZh ? tab : (tab === '全部' ? 'All' : tab)}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {pulse.concat(pulse.slice(0, 2)).map((item, idx) => (
                        <div key={`${item.titleEn}-${idx}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${levelColor(item.level)}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex gap-2 text-[11px] font-semibold text-slate-400">
                              <span>{item.level}</span>
                              <span>{isZh ? item.timeZh : item.timeEn}</span>
                            </div>
                            <div className="mt-1 text-[15px] font-bold leading-6">
                              {isZh ? item.titleZh : item.titleEn}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {['Market Card', 'Fear & Greed', 'Trending Coins', 'Newsletter'].map((box) => (
                      <div key={box} className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="mt-4 space-y-2">
                          <div className="h-3 rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-4 text-xl font-black tracking-[-0.03em]">
                    {isZh ? '深度分析' : 'Analysis'}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {features.map((item) => (
                      <div key={item.titleEn} className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0066FF]">
                          {isZh ? item.tagZh : item.tagEn}
                        </div>
                        <div className="mt-3 text-lg font-bold leading-7">
                          {isZh ? item.titleZh : item.titleEn}
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {isZh ? item.descZh : item.descEn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
