import { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { TrendingTable } from '@/components/TrendingTable';

interface Props {
  params: { locale: Locale };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const isZh = locale === 'zh';
  const title = isZh ? '热门Token排行榜 | HashSpring' : 'Hot Tokens Ranking | HashSpring';
  const description = isZh
    ? '实时追踪最热门的加密货币Token，基于交易量和价格动量计算热度分，掌握市场脉搏'
    : 'Real-time ranking of trending crypto tokens by volume and price momentum heat score';
  const canonical = `https://hashspring.com/${locale}/trending`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'en': 'https://hashspring.com/en/trending',
        'zh': 'https://hashspring.com/zh/trending',
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'HashSpring',
      type: 'website',
    },
  };
}

export default async function TrendingPage({ params }: Props) {
  const { locale } = params;
  const dict = await getDictionary(locale);
  const isZh = locale === 'zh';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: isZh ? '热门Token排行榜' : 'Hot Tokens Ranking',
    description: isZh
      ? '实时加密货币热度排行，基于OKX交易量和价格动量'
      : 'Real-time crypto token heat ranking based on OKX volume and price momentum',
    url: `https://hashspring.com/${locale}/trending`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            {isZh ? '🔥 热门Token排行榜' : '🔥 Hot Tokens Ranking'}
          </h1>
          <p className="text-sm text-gray-400">
            {isZh
              ? '基于OKX实时数据 · 交易量(55%) + 价格动量(45%) · 每60秒更新'
              : 'Powered by OKX real-time data · Volume(55%) + Momentum(45%) · Updates every 60s'}
          </p>
        </div>

        {/* Main grid: table + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <TrendingTable locale={locale} />

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-[#12121f] rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                {isZh ? '📊 热度算法说明' : '📊 Heat Score Formula'}
              </h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>{isZh ? '交易量权重' : 'Volume weight'}</span>
                  <span className="text-blue-400 font-medium">55%</span>
                </div>
                <div className="flex justify-between">
                  <span>{isZh ? '价格动量权重' : 'Momentum weight'}</span>
                  <span className="text-blue-400 font-medium">45%</span>
                </div>
                <div className="flex justify-between">
                  <span>{isZh ? '数据来源' : 'Data source'}</span>
                  <span className="text-white font-medium">OKX</span>
                </div>
                <div className="flex justify-between">
                  <span>{isZh ? '更新频率' : 'Refresh rate'}</span>
                  <span className="text-white font-medium">60s</span>
                </div>
              </div>
            </div>

            <div className="bg-[#12121f] rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">
                {isZh ? '🎯 热度等级' : '🎯 Heat Levels'}
              </h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { color: 'bg-red-500', label: isZh ? '极热 (80+)' : 'Extreme (80+)' },
                  { color: 'bg-orange-400', label: isZh ? '热门 (60-79)' : 'Hot (60-79)' },
                  { color: 'bg-yellow-400', label: isZh ? '活跃 (40-59)' : 'Active (40-59)' },
                  { color: 'bg-blue-400', label: isZh ? '普通 (<40)' : 'Normal (<40)' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
