import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://skfpuzlnhkoyifewvisz.supabase.co";
const SUPABASE_KEY = "sb_secret_Q171Gz1WVTsdXa_WZ7ndww_vexjbhXH";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const payload = {
  content_hash: "market_overview_20260410",
  title: "Daily Market: BTC Rises to $71,860 (+1.44%), ETH Flat, SOL Gains 1%",
  title_zh: "每日行情：BTC 升至 $71,860（+1.44%），ETH 持平，SOL 涨 1%",
  description: "Daily crypto market overview for April 10, 2026. BTC, ETH, and SOL show modest gains across the board.",
  body_en: `**BTC/USDT** closed at $71,860.63, up +1.44% over the past 24 hours. The 24h trading range was $70,458.67 – $73,156.12, with a volume of 4,739.92 BTC (~$339.6M).

**ETH/USDT** traded at $2,190.35, gaining a modest +0.33%. The 24h range was $2,156.96 – $2,246.91, with volume of 87,615.14 ETH (~$192.4M).

**SOL/USDT** was priced at $83.02, up +1.01%. The 24h range was $81.43 – $85.94, with volume of 138,857.67 SOL (~$11.6M).

Overall, the market saw mild bullish momentum with BTC leading the way. No major volatility events recorded.`,
  body_zh: `**BTC/USDT** 收于 $71,860.63，24 小时涨幅 +1.44%。日内波动区间为 $70,458.67 – $73,156.12，成交量为 4,739.92 BTC（约 3.40 亿美元）。

**ETH/USDT** 报价 $2,190.35，小幅上涨 +0.33%。日内区间为 $2,156.96 – $2,246.91，成交量为 87,615.14 ETH（约 1.92 亿美元）。

**SOL/USDT** 报价 $83.02，上涨 +1.01%。日内区间为 $81.43 – $85.94，成交量为 138,857.67 SOL（约 1,155 万美元）。

整体市场呈现温和上涨态势，BTC 涨幅领先。未出现重大波动事件。`,
  link: "https://www.okx.com/trade-spot/btc-usdt",
  source: "OKX",
  source_type: "market-data",
  category: "Market Overview",
  level: "green",
  pub_date: new Date("2026-04-10T01:03:06.000Z").toISOString(),
  lang: "en"
};

const { data, error } = await supabase
  .from('flash_news')
  .upsert(payload, { onConflict: 'content_hash' })
  .select();

if (error) {
  console.error('ERROR:', JSON.stringify(error));
  process.exit(1);
} else {
  console.log('SUCCESS:', JSON.stringify(data));
}
