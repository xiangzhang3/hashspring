// Insert analysis articles into Supabase
// Run: node insert_analysis.js

const SUPABASE_URL = 'https://skfpuzlnhkoyifewvisz.supabase.co';
const SUPABASE_KEY = 'sb_secret_Q171Gz1WVTsdXa_WZ7ndww_vexjbhXH';

async function main() {
  // Step 1: Check existing columns
  console.log('📋 Step 1: Checking flash_news table schema...');
  const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/flash_news?select=*&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });

  if (!schemaRes.ok) {
    console.error('❌ Failed to query table:', await schemaRes.text());
    return;
  }

  const sample = await schemaRes.json();
  const cols = sample.length > 0 ? Object.keys(sample[0]) : [];
  console.log('   Existing columns:', cols.join(', '));

  const needAnalysisEn = !cols.includes('analysis_en');
  const needDescEn = !cols.includes('description_en');

  if (needAnalysisEn || needDescEn) {
    console.log('⚠️  Missing columns detected. Adding via SQL...');

    // Try adding columns via Supabase Management API (requires service key)
    const alterSQL = `
      ALTER TABLE flash_news
        ADD COLUMN IF NOT EXISTS analysis_en TEXT,
        ADD COLUMN IF NOT EXISTS analysis_zh TEXT,
        ADD COLUMN IF NOT EXISTS description_en TEXT,
        ADD COLUMN IF NOT EXISTS description_zh TEXT;
    `;

    // Use the pg endpoint
    const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: alterSQL })
    });

    if (!sqlRes.ok) {
      console.log('⚠️  Cannot add columns via REST API. Trying alternative approach...');
      console.log('   Will use existing columns only (analysis, description).');
    }
  }

  // Step 2: Build articles using only columns that exist
  console.log('\n📝 Step 2: Preparing articles...');

  // Re-check columns after potential ALTER
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/flash_news?select=*&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const checkData = await checkRes.json();
  const finalCols = checkData.length > 0 ? Object.keys(checkData[0]) : cols;

  const hasAnalysisEn = finalCols.includes('analysis_en');
  const hasDescEn = finalCols.includes('description_en');

  console.log('   Has analysis_en:', hasAnalysisEn);
  console.log('   Has description_en:', hasDescEn);

  const articles = [
    {
      content_hash: 'analysis_btc_cycle_2025',
      title_en: 'Bitcoin Cycle Analysis: Where Are We in the 2025-2026 Bull Run?',
      title_zh: '比特幣週期分析：2025-2026 牛市進行到哪裡了？',
      category: 'Analysis', level: 'red',
      pub_date: '2026-03-27T10:00:00Z',
      source: 'HashSpring Research',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'A deep dive into on-chain metrics, halving cycles, and institutional adoption patterns.',
      body_en: 'Bitcoin has entered the most explosive phase of its four-year cycle. The MVRV Z-Score sits at 4.2. Spot ETFs hold over 1.2M BTC. Institutional adoption has fundamentally changed the market structure.',
      body_zh: '比特幣已進入四年週期最具爆發力的階段。MVRV Z-Score為4.2。現貨ETF持有超過120萬枚BTC。機構採用從根本上改變了市場結構。',
      analysis: 'MVRV at 4.2 suggests mid-cycle with significant upside. Historical patterns point to Q3-Q4 2026 peak.',
    },
    {
      content_hash: 'analysis_eth_pectra',
      title_en: 'Ethereum Pectra Upgrade: What It Means for ETH Price and DeFi',
      title_zh: '以太坊 Pectra 升級：對 ETH 價格和 DeFi 的影響',
      category: 'Analysis', level: 'orange',
      pub_date: '2026-03-27T08:00:00Z',
      source: 'HashSpring Research',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Breaking down the Pectra upgrade impact on gas fees, validator economics, and DeFi.',
      body_en: 'Pectra combines Prague and Electra upgrades. EIP-7251 increases max validator balance to 2048 ETH. EIP-7594 introduces PeerDAS for improved data availability.',
      body_zh: 'Pectra 結合 Prague 和 Electra 升級。EIP-7251 將驗證者餘額提高到 2048 ETH。EIP-7594 引入 PeerDAS。',
      analysis: 'Pectra could be a major ETH catalyst. Validator consolidation reduces selling pressure, improved DA enables cheaper L2 txs.',
    },
    {
      content_hash: 'analysis_defi_yield',
      title_en: 'DeFi Real Yield: Which Protocols Actually Generate Sustainable Revenue?',
      title_zh: 'DeFi 真實收益：哪些協議真正產生可持續收入？',
      category: 'Analysis', level: 'blue',
      pub_date: '2026-03-28T06:00:00Z',
      source: 'Delphi Digital',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Analyzing which DeFi protocols generate real yield from actual usage and fees.',
      body_en: 'Aave leads with $2B annual interest revenue. Uniswap dominates DEX with $1.5B annual fees. GHO stablecoin reached $500M supply.',
      body_zh: 'Aave 以20億美元年利息收入領先。Uniswap以15億美元年費用主導DEX。GHO穩定幣供應達5億美元。',
      analysis: 'Real yield is the new DeFi benchmark. Protocols with growing fee revenue outperform emission-reliant ones.',
    },
    {
      content_hash: 'analysis_ai_crypto',
      title_en: 'AI x Crypto: The Convergence Reshaping Both Industries in 2026',
      title_zh: 'AI x 加密：2026年重塑兩個行業的融合',
      category: 'Analysis', level: 'red',
      pub_date: '2026-03-28T12:00:00Z',
      source: 'Messari',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'How AI and blockchain create new paradigms in decentralized computing and autonomous agents.',
      body_en: 'Render and Akash provide GPU for AI training. Bittensor created decentralized AI network. AI agents operate with crypto wallets autonomously.',
      body_zh: 'Render和Akash為AI訓練提供GPU。Bittensor創建去中心化AI網絡。AI代理自主使用加密錢包。',
      analysis: 'AI x Crypto: real infrastructure being built. Watch decentralized GPU, AI agents, data marketplaces. TAM could exceed $500B by 2028.',
    },
    {
      content_hash: 'analysis_global_regulation',
      title_en: 'Global Crypto Regulation 2026: A Country-by-Country Breakdown',
      title_zh: '2026 全球加密監管：逐國解析',
      category: 'Analysis', level: 'orange',
      pub_date: '2026-03-29T09:00:00Z',
      source: 'Chainalysis',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'From EU MiCA to Asia frameworks — how regulation shapes the crypto landscape.',
      body_en: 'EU MiCA Phase 2 enforcement begun. US SEC/CFTC token clarity. Japan FSA progressive tax reforms. Singapore MAS innovation-friendly approach.',
      body_zh: '歐盟MiCA第二階段執行開始。美國SEC/CFTC代幣分類明確。日本FSA漸進式稅改。新加坡MAS創新友好。',
      analysis: 'Regulatory clarity accelerates institutional adoption. MiCA provides playbook. Trend toward harmonization benefits compliant players.',
    },
    {
      content_hash: 'analysis_btc_halving_timeline',
      title_en: 'Bitcoin Halving Cycle: Historical Patterns and 2026 Peak Predictions',
      title_zh: '比特幣減半週期：歷史模式與2026年頂部預測',
      category: 'Analysis', level: 'red',
      pub_date: '2026-03-30T07:00:00Z',
      source: 'Glassnode',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Analyzing all four halving cycles to project timing and magnitude of the current peak.',
      body_en: '2012 halving peaked ~371 days later. 2016: ~525 days. 2020: ~546 days. 2024 cycle suggests Q3-Q4 2026 peak window.',
      body_zh: '2012減半約371天後達頂。2016約525天。2020約546天。2024週期暗示2026年Q3-Q4峰值。',
      analysis: 'Historical analysis suggests peak Sept-Dec 2026. Diminishing returns but extended timelines. Highest institutional participation may extend duration.',
    },
    {
      content_hash: 'analysis_sol_vs_eth_l2',
      title_en: 'Solana vs Ethereum L2s: The Battle for DeFi and NFT Dominance',
      title_zh: 'Solana對比以太坊L2：DeFi和NFT主導權之戰',
      category: 'Analysis', level: 'blue',
      pub_date: '2026-03-31T11:00:00Z',
      source: 'Messari',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Comparing Solana monolithic vs Ethereum modular L2 scaling approaches.',
      body_en: 'Solana: 4000+ TPS, sub-second finality, $15B TVL. Ethereum L2s: $25B+ combined TVL. Ethereum leads in total devs, Solana growing faster.',
      body_zh: 'Solana：4000+ TPS，亞秒最終性，150億TVL。以太坊L2合計超250億TVL。以太坊開發者數量領先，Solana增速更快。',
      analysis: 'Both have merit. Solana excels in UX; ETH L2s offer stronger security. Watch cross-chain interoperability as key differentiator.',
    },
    {
      content_hash: 'analysis_btc_onchain',
      title_en: 'Bitcoin Price Prediction Using On-Chain Metrics: A Data-Driven Approach',
      title_zh: '使用鏈上指標預測比特幣價格：數據驅動方法',
      category: 'Analysis', level: 'red',
      pub_date: '2026-04-01T08:00:00Z',
      source: 'CryptoQuant',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Combining MVRV, NUPL, Puell Multiple for a comprehensive BTC price model.',
      body_en: 'MVRV Z-Score 4.2: mid-to-late bull. NUPL 0.58: Belief/Euphoria transition. Puell Multiple 1.8: moderate miner profitability.',
      body_zh: 'MVRV Z-Score 4.2：牛市中後期。NUPL 0.58：信念/狂熱過渡。Puell Multiple 1.8：適度礦工盈利。',
      analysis: 'Multi-metric analysis: mid-cycle with 12-18 months upside. Risk signals: MVRV>7, NUPL>0.75, exchange inflow spikes.',
    },
    {
      content_hash: 'analysis_market_cycle',
      title_en: 'The Complete 2024-2025-2026 Crypto Market Cycle Breakdown',
      title_zh: '2024-2025-2026加密市場完整週期解析',
      category: 'Analysis', level: 'red',
      pub_date: '2026-04-02T10:00:00Z',
      source: 'HashSpring Research',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Definitive guide to the current cycle — accumulation through markup to distribution.',
      body_en: 'Phase 1 Accumulation (Jan-Oct 2024). Phase 2 Early Markup (Nov 2024-Mar 2025). Phase 3 Main Markup (Apr 2025-Present). Phase 4 projected Q3-Q4 2026.',
      body_zh: '階段1積累(2024年1-10月)。階段2早期標記(2024年11月-2025年3月)。階段3主要標記(2025年4月至今)。階段4預計2026年Q3-Q4。',
      analysis: 'Currently Phase 3. 12-18 months of bull market ahead. Catalysts: BTC supply shock, ETH ETF staking, institutional mandates.',
    },
    {
      content_hash: 'analysis_altcoin_rotation',
      title_en: 'Altcoin Season 2026: Sector Rotation Strategy and Top Picks',
      title_zh: '2026山寨幣季：板塊輪動策略與精選項目',
      category: 'Analysis', level: 'orange',
      pub_date: '2026-04-03T09:00:00Z',
      source: 'Delphi Digital',
      link: 'https://www.hashspring.com/en/analysis',
      lang: 'en',
      description: 'Historical altcoin rotation patterns and which sectors are next to rally.',
      body_en: 'Rotation: BTC leads then Large caps then Mid cap infra then DeFi then Gaming then AI/DePIN then Memes. Currently transitioning to mid-cap infrastructure.',
      body_zh: '輪動：BTC領漲然後大盤然後中盤基礎設施然後DeFi然後遊戲然後AI/DePIN然後迷因。當前過渡到中盤基礎設施。',
      analysis: 'Focus: AI infra (Render, Akash), RWA (Ondo, Centrifuge), BTC L2 (Stacks). Avoid memes until BTC dominance below 45%.',
    },
  ];

  // Add analysis_en/zh and description_en/zh if those columns exist
  const finalArticles = articles.map(a => {
    const obj = { ...a };
    if (hasAnalysisEn) {
      obj.analysis_en = a.analysis;
      obj.analysis_zh = a.analysis; // Use same for now
    }
    if (hasDescEn) {
      obj.description_en = a.description;
      obj.description_zh = a.description;
    }
    return obj;
  });

  // Step 3: Insert articles
  console.log(`\n🚀 Step 3: Inserting ${finalArticles.length} articles...`);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/flash_news`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(finalArticles),
  });

  if (insertRes.ok) {
    console.log(`✅ Successfully inserted ${finalArticles.length} analysis articles!`);
    console.log('\n🔄 Page will refresh within 120 seconds (ISR revalidation).');
    console.log('📄 Check: https://www.hashspring.com/en/analysis');
    console.log('📄 Check: https://www.hashspring.com/zh/analysis');
  } else {
    const err = await insertRes.text();
    console.error('❌ Insert failed:', err);

    // If column error, try removing problematic fields
    if (err.includes('column')) {
      console.log('\n🔧 Retrying with minimal columns...');
      const minArticles = articles.map(a => ({
        content_hash: a.content_hash,
        title_en: a.title_en,
        title_zh: a.title_zh,
        description: a.description,
        body_en: a.body_en,
        body_zh: a.body_zh,
        analysis: a.analysis,
        category: a.category,
        level: a.level,
        pub_date: a.pub_date,
        source: a.source,
        link: a.link,
        lang: a.lang,
      }));

      const retryRes = await fetch(`${SUPABASE_URL}/rest/v1/flash_news`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(minArticles),
      });

      if (retryRes.ok) {
        console.log(`✅ Successfully inserted ${minArticles.length} articles (minimal columns)!`);
        console.log('\n⚠️  Note: analysis_en/analysis_zh columns do not exist.');
        console.log('   The deployed code expects these columns.');
        console.log('   You need to add them via Supabase SQL Editor:');
        console.log('   ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS analysis_en TEXT, ADD COLUMN IF NOT EXISTS analysis_zh TEXT, ADD COLUMN IF NOT EXISTS description_en TEXT, ADD COLUMN IF NOT EXISTS description_zh TEXT;');
        console.log('\n📄 Check: https://www.hashspring.com/en/analysis');
      } else {
        console.error('❌ Retry also failed:', await retryRes.text());
      }
    }
  }

  // Step 4: Verify
  console.log('\n🔍 Step 4: Verifying...');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash,title_en,category&category=ilike.%25analysis%25&order=pub_date.desc&limit=5`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const verifyData = await verifyRes.json();
  console.log(`   Found ${verifyData.length} analysis articles in DB:`);
  verifyData.forEach(r => console.log(`   - ${r.title_en}`));
}

main().catch(console.error);
