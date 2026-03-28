import { getDictionary } from '@/lib/i18n';
import MarketTable from '@/components/MarketTable';
import TrendingCoins from '@/components/TrendingCoins';
import { Sidebar } from '@/components/Sidebar';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  return {
    title: `${dict.nav[2]} | HashSpring`,
    description: dict.locale === 'en'
      ? 'Real-time cryptocurrency market data, prices, trends and analysis from CoinGecko.'
      : '即時加密貨幣行情數據、價格、趨勢與分析，數據來源 CoinGecko。',
  };
}

export default async function MarketPage({ params }: { params: { locale: string } }) {
  const dict = await getDictionary(params.locale);
  const isEn = params.locale === 'en';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isEn ? 'Cryptocurrency Market' : '加密貨幣行情'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isEn
            ? 'Real-time prices, market cap, volume and trends powered by CoinGecko'
            : '即時價格、市值、成交量與趨勢，數據來源 CoinGecko'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Market Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MarketStatCard
              label={isEn ? 'Total Market Cap' : '總市值'}
              value="$3.21T"
              change="+2.4%"
              positive
            />
            <MarketStatCard
              label={isEn ? '24h Volume' : '24h 成交量'}
              value="$142.8B"
              change="-5.1%"
              positive={false}
            />
            <MarketStatCard
              label={isEn ? 'BTC Dominance' : 'BTC 佔比'}
              value="52.3%"
              change="+0.8%"
              positive
            />
            <MarketStatCard
              label={isEn ? 'Active Coins' : '活躍幣種'}
              value="12,847"
              change=""
              positive
            />
          </div>

          {/* Full Market Table */}
          <MarketTable locale={params.locale} />

          {/* Trending Section */}
          <TrendingCoins locale={params.locale} />
        </div>

        {/* Sidebar */}
        <Sidebar dict={dict} />
      </div>
    </div>
  );
}

function MarketStatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      {change && (
        <p className={`text-xs font-medium tabular-nums ${positive ? 'text-green-500' : 'text-red-500'}`}>
          {change}
        </p>
      )}
    </div>
  );
}
