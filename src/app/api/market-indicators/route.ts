import { NextResponse } from 'next/server';

export const revalidate = 60; // 1分钟缓存

interface Indicator {
  label: string;
  labelZh: string;
  value: string;
  change?: string;
  up?: boolean;
}

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export async function GET() {
  const indicators: Indicator[] = [];

  // 并发获取所有数据
  const [globalRes, fearRes, defiRes, gasRes] = await Promise.allSettled([
    // 1. CoinGecko Global Data
    fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'HashSpring/1.0' },
    }),
    // 2. Fear & Greed Index
    fetch('https://api.alternative.me/fng/?limit=1', {
      signal: AbortSignal.timeout(8000),
    }),
    // 3. DeFi TVL from DeFiLlama
    fetch('https://api.llama.fi/v2/historicalChainTvl', {
      signal: AbortSignal.timeout(8000),
    }),
    // 4. ETH Gas
    fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle', {
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  // Process Global Market Data
  if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
    try {
      const json = await globalRes.value.json();
      const data = json.data;

      indicators.push({
        label: 'Total Market Cap',
        labelZh: '加密市場總市值',
        value: formatLargeNumber(data.total_market_cap?.usd || 0),
        change: Math.abs(data.market_cap_change_percentage_24h_usd || 0).toFixed(1) + '%',
        up: (data.market_cap_change_percentage_24h_usd || 0) >= 0,
      });

      indicators.push({
        label: 'BTC Market Cap',
        labelZh: 'BTC 市值',
        value: formatLargeNumber(data.total_market_cap?.usd * (data.market_cap_percentage?.btc || 0) / 100 || 0),
      });

      indicators.push({
        label: 'BTC Dominance',
        labelZh: 'BTC 佔比',
        value: (data.market_cap_percentage?.btc || 0).toFixed(1) + '%',
      });

      indicators.push({
        label: 'ETH/BTC Ratio',
        labelZh: 'ETH/BTC 比率',
        value: ((data.market_cap_percentage?.eth || 0) / (data.market_cap_percentage?.btc || 1)).toFixed(3),
      });

      indicators.push({
        label: '24h Volume',
        labelZh: '24h 總交易量',
        value: formatLargeNumber(data.total_volume?.usd || 0),
      });
    } catch { /* skip */ }
  }

  // Process Fear & Greed
  if (fearRes.status === 'fulfilled' && fearRes.value.ok) {
    try {
      const json = await fearRes.value.json();
      const fg = json.data?.[0];
      if (fg) {
        const val = parseInt(fg.value);
        const cls = fg.value_classification;
        indicators.push({
          label: `Fear & Greed: ${cls}`,
          labelZh: `恐懼貪婪指數: ${cls}`,
          value: String(val),
        });
      }
    } catch { /* skip */ }
  }

  // Process DeFi TVL
  if (defiRes.status === 'fulfilled' && defiRes.value.ok) {
    try {
      const json = await defiRes.value.json();
      if (Array.isArray(json) && json.length > 0) {
        const latest = json[json.length - 1];
        const prev = json.length > 1 ? json[json.length - 2] : null;
        const tvl = latest.tvl || 0;
        indicators.push({
          label: 'DeFi TVL',
          labelZh: 'DeFi 總鎖倉',
          value: formatLargeNumber(tvl),
          change: prev ? Math.abs(((tvl - prev.tvl) / prev.tvl) * 100).toFixed(1) + '%' : undefined,
          up: prev ? tvl >= prev.tvl : undefined,
        });
      }
    } catch { /* skip */ }
  }

  // Process ETH Gas
  if (gasRes.status === 'fulfilled' && gasRes.value.ok) {
    try {
      const json = await gasRes.value.json();
      if (json.result) {
        indicators.push({
          label: 'ETH Gas',
          labelZh: 'ETH Gas 費',
          value: (json.result.SafeGasPrice || json.result.ProposeGasPrice || '?') + ' gwei',
        });
      }
    } catch { /* skip */ }
  }

  return NextResponse.json(indicators, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
