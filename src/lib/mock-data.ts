import type { FlashItem } from '@/components/FlashFeed';

export async function fetchLiveFlashItems(locale: string): Promise<FlashItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `/api/flash-news?locale=${locale}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Failed to fetch live flash items:', response.status);
      return getFlashItems(locale);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : getFlashItems(locale);
  } catch (error) {
    console.warn('Error fetching live flash items:', error);
    return getFlashItems(locale);
  }
}

export const flashItemsEn: FlashItem[] = [
  { id: 'btc-95k', level: 'red', time: '2m', title: 'Bitcoin surges past $95,000 as institutional inflows hit record $2.1B in single day', category: 'BTC' },
  { id: 'eth-etf-options', level: 'orange', time: '8m', title: 'SEC approves first spot Ethereum ETF options trading, opening new derivatives market', category: 'ETH' },
  { id: 'uni-v4', level: 'blue', time: '15m', title: 'Uniswap v4 launches with hook-based customization, TVL reaches $500M in first hour', category: 'DeFi' },
  { id: 'japan-fsa', level: 'red', time: '22m', title: 'Japan FSA announces comprehensive crypto regulatory framework effective Q3 2026', category: 'Policy' },
  { id: 'sol-tps', level: 'blue', time: '35m', title: 'Solana processes 100,000 TPS in stress test, setting new blockchain throughput record', category: 'SOL' },
  { id: 'mstr-btc', level: 'orange', time: '42m', title: 'MicroStrategy acquires additional 15,000 BTC worth $1.4B, total holdings reach 450K BTC', category: 'BTC' },
  { id: 'base-arb', level: 'blue', time: '55m', title: 'Base network surpasses Arbitrum in daily active addresses for the first time', category: 'L2' },
  { id: 'tether-q1', level: 'orange', time: '1h', title: 'Tether reports $4.5B profit in Q1 2026, US Treasury holdings exceed $95B', category: 'Stable' },
  { id: 'opensea-free', level: 'blue', time: '1h', title: 'OpenSea introduces zero-fee trading model, NFT market volume jumps 300%', category: 'NFT' },
  { id: 'mica-phase2', level: 'red', time: '2h', title: 'EU MiCA regulation Phase 2 enforcement begins, exchanges rush to comply', category: 'Policy' },
];

export const flashItemsZh: FlashItem[] = [
  { id: 'btc-95k', level: 'red', time: '2分鐘', title: '比特幣突破 95,000 美元，機構單日流入資金創紀錄達 21 億美元', category: 'BTC' },
  { id: 'eth-etf-options', level: 'orange', time: '8分鐘', title: 'SEC 批准首個現貨以太坊 ETF 期權交易，開啟新的衍生品市場', category: 'ETH' },
  { id: 'uni-v4', level: 'blue', time: '15分鐘', title: 'Uniswap v4 上線，支援 Hook 自定義，TVL 首小時即達 5 億美元', category: 'DeFi' },
  { id: 'japan-fsa', level: 'red', time: '22分鐘', title: '日本金融廳發佈全面加密監管框架，將於 2026 Q3 生效', category: '監管' },
  { id: 'sol-tps', level: 'blue', time: '35分鐘', title: 'Solana 壓測處理 10 萬 TPS，創區塊鏈吞吐量新紀錄', category: 'SOL' },
  { id: 'mstr-btc', level: 'orange', time: '42分鐘', title: 'MicroStrategy 再購 15,000 BTC，價值 14 億美元，總持倉達 45 萬', category: 'BTC' },
  { id: 'base-arb', level: 'blue', time: '55分鐘', title: 'Base 網路日活躍地址數首次超越 Arbitrum', category: 'L2' },
  { id: 'tether-q1', level: 'orange', time: '1小時', title: 'Tether Q1 利潤 45 億美元，美國國債持倉超 950 億', category: '穩定幣' },
  { id: 'opensea-free', level: 'blue', time: '1小時', title: 'OpenSea 推出零手續費模式，NFT 交易量飆升 300%', category: 'NFT' },
  { id: 'mica-phase2', level: 'red', time: '2小時', title: '歐盟 MiCA 第二階段執行啟動，交易所加緊合規', category: '監管' },
];

export function getFlashItems(locale: string): FlashItem[] {
  return locale === 'zh' ? flashItemsZh : flashItemsEn;
}

// Analysis Articles
export interface AnalysisArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  date: string;
  readTime: string;
  author: string;
  emoji: string;
  tags: string[];
}

const analysisEn: AnalysisArticle[] = [
  {
    id: 'btc-cycle-analysis',
    title: 'Bitcoin Cycle Analysis: Where Are We in the 2025-2026 Bull Run?',
    excerpt: 'A deep dive into on-chain metrics, halving cycles, and institutional adoption patterns to predict where Bitcoin is headed next.',
    content: [
      'Bitcoin has entered what many analysts consider the most explosive phase of its four-year cycle. Following the April 2024 halving, the reduced supply issuance combined with unprecedented institutional demand has created a perfect storm for price appreciation.',
      'On-chain data tells a compelling story. The MVRV Z-Score, which measures the ratio of market value to realized value, currently sits at 4.2 — historically, readings above 7 have signaled cycle tops. This suggests significant upside potential remains.',
      'Institutional adoption has fundamentally changed the market structure. With spot ETFs collectively holding over 1.2 million BTC and sovereign wealth funds beginning allocation, the demand side of the equation has never been stronger.',
      'However, risks remain. The Federal Reserve\'s monetary policy trajectory, potential regulatory crackdowns, and the ever-present threat of black swan events could derail the bull thesis. Prudent risk management remains essential.',
      'Our base case targets $120,000-$150,000 for the cycle peak, with the possibility of overshooting to $180,000+ in a blow-off top scenario. The timeline points to late Q3 or Q4 2026 for the cycle peak.',
    ],
    category: 'Bitcoin',
    date: 'Mar 27, 2026',
    readTime: '8 min read',
    author: 'HashSpring Research',
    emoji: '📊',
    tags: ['Bitcoin', 'CycleAnalysis', 'OnChain', 'ETF'],
  },
  {
    id: 'eth-pectra-impact',
    title: 'Ethereum Pectra Upgrade: What It Means for Scalability and Staking',
    excerpt: 'Breaking down the technical improvements and economic implications of Ethereum\'s latest major upgrade.',
    content: [
      'The Pectra upgrade represents the next major milestone in Ethereum\'s roadmap. Combining both the Prague (execution layer) and Electra (consensus layer) upgrades, it brings significant improvements to account abstraction, validator operations, and data availability.',
      'EIP-7702 introduces a native account abstraction mechanism, allowing externally owned accounts (EOAs) to temporarily adopt smart contract functionality. This dramatically improves user experience by enabling gas sponsorship, batch transactions, and social recovery.',
      'For validators, the increase of the MAX_EFFECTIVE_BALANCE to 2048 ETH means large operators can consolidate validators, reducing network overhead and improving efficiency. Solo stakers benefit from automatic compounding of rewards.',
      'The data availability improvements through EIP-7594 (PeerDAS) increase blob capacity, reducing L2 transaction costs by an estimated 40-60%. This makes Ethereum rollups even more competitive against alternative L1s.',
    ],
    category: 'Ethereum',
    date: 'Mar 26, 2026',
    readTime: '6 min read',
    author: 'HashSpring Research',
    emoji: '💎',
    tags: ['Ethereum', 'Pectra', 'Staking', 'L2'],
  },
  {
    id: 'defi-real-yield',
    title: 'The Rise of Real Yield: DeFi Protocols That Actually Generate Revenue',
    excerpt: 'Moving beyond token emission farming — which DeFi protocols are building sustainable business models?',
    content: [
      'The DeFi landscape has matured significantly since the yield farming mania of 2020-2021. Today, the most valuable protocols are those generating real revenue from actual user activity, not just incentivized liquidity mining.',
      'Leading the pack is Uniswap, which generates over $5M daily in fee revenue. The recently launched v4 with its hook system has attracted innovative developers building custom AMM logic, from dynamic fee structures to limit orders.',
      'Aave and Compound have evolved into the backbone of on-chain lending, with combined TVL exceeding $30B. Their real yield comes from the interest rate spread between borrowers and lenders.',
      'The RWA (Real World Asset) sector represents perhaps the most significant growth vector. Protocols tokenizing US Treasuries, corporate bonds, and real estate are bridging TradFi and DeFi in meaningful ways.',
    ],
    category: 'DeFi',
    date: 'Mar 25, 2026',
    readTime: '7 min read',
    author: 'HashSpring Research',
    emoji: '🌾',
    tags: ['DeFi', 'RealYield', 'Revenue', 'RWA'],
  },
  {
    id: 'ai-crypto-convergence',
    title: 'AI x Crypto: The Convergence Reshaping Both Industries',
    excerpt: 'How decentralized AI networks, on-chain inference, and tokenized compute are creating new paradigms.',
    content: [
      'The intersection of AI and crypto has emerged as one of the most compelling narratives in the current cycle. Beyond the hype, real infrastructure is being built that could fundamentally change how AI models are trained, deployed, and monetized.',
      'Decentralized compute networks like Render, Akash, and io.net are creating marketplaces for GPU resources. As AI training costs skyrocket, these networks offer a cost-effective alternative to centralized cloud providers.',
      'On-chain AI agents represent another frontier. Projects like Autonolas and Fetch.ai are building frameworks for autonomous agents that can interact with DeFi protocols, execute trades, and manage portfolios.',
      'The key challenge remains latency and throughput. Current blockchain infrastructure struggles with the real-time demands of AI inference. Solutions combining off-chain computation with on-chain verification are emerging.',
    ],
    category: 'AI',
    date: 'Mar 24, 2026',
    readTime: '6 min read',
    author: 'HashSpring Research',
    emoji: '🤖',
    tags: ['AI', 'DePIN', 'Compute', 'Agents'],
  },
  {
    id: 'global-regulation-map',
    title: 'Global Crypto Regulation in 2026: A Comprehensive Country-by-Country Guide',
    excerpt: 'From EU MiCA to US stablecoin bills — tracking the regulatory landscape shaping the industry.',
    content: [
      'The global regulatory landscape for cryptocurrency has reached an inflection point in 2026. Major jurisdictions are moving from exploratory frameworks to concrete, enforceable regulations.',
      'The EU\'s MiCA regulation Phase 2 has gone into full effect, creating the world\'s most comprehensive crypto regulatory framework. CASP (Crypto-Asset Service Provider) licensing is now mandatory, with strict capital requirements and consumer protection measures.',
      'In the US, the bipartisan stablecoin bill has finally passed, providing regulatory clarity for dollar-pegged tokens. Meanwhile, the SEC and CFTC continue jurisdictional disputes over spot market oversight.',
      'Asia presents a mixed picture. Japan and Singapore lead with progressive frameworks, while China maintains its ban. Hong Kong has emerged as a significant crypto hub with its new licensing regime.',
    ],
    category: 'Policy',
    date: 'Mar 23, 2026',
    readTime: '10 min read',
    author: 'HashSpring Research',
    emoji: '⚖️',
    tags: ['Regulation', 'MiCA', 'Policy', 'Compliance'],
  },
  {
    id: 'bitcoin-halving-bull-run-2024-2025-2026',
    title: 'Bitcoin Halving Cycle & Bull Run Timeline: 2024–2026 Complete Roadmap',
    excerpt: 'Historical halving data, on-chain signals, and market structure analysis paint a clear picture of the current bull run timeline through 2026.',
    content: [
      'Every four years, Bitcoin undergoes a halving event that cuts the block reward in half, dramatically reducing new supply entering the market. The April 2024 halving reduced the daily issuance from 900 BTC to 450 BTC — a supply shock that historically triggers the most powerful phase of the bull market 6–18 months later.',
      'Looking at the 2012, 2016, and 2020 halving cycles, the pattern is consistent: a period of accumulation post-halving, followed by a parabolic advance, then a blow-off top. Based on cycle timing, the 2024 halving points to a peak window of Q3–Q4 2026.',
      'On-chain metrics support this thesis. The Puell Multiple — which measures daily miner revenue relative to its 365-day moving average — is in the "buy zone" at 1.3, consistent with mid-cycle readings in prior bull markets. Meanwhile, long-term holders (LTHs) are still HODLing aggressively, with LTH supply at multi-year highs.',
      'The macro backdrop provides additional tailwinds. The Fed\'s rate-cutting cycle, combined with unprecedented ETF demand (over $2B in weekly inflows at peak), has introduced a new demand floor that prior cycles never had. This structural change could mean the 2026 peak surpasses all historical price-to-cycle-peak ratios.',
      'Key risk events to monitor: FOMC decisions on rate trajectory, potential regulatory action in the US, and geopolitical developments affecting risk appetite. A macro shock could delay (but likely not derail) the cycle peak.',
      'Target price range for the 2025–2026 cycle peak: $120,000–$180,000, with $150,000 as the base case. Time your exposure around Bitcoin dominance trends — when altcoins begin to significantly outperform, the cycle peak is typically 3–6 months away.',
    ],
    category: 'Bitcoin',
    date: 'Apr 2, 2026',
    readTime: '10 min read',
    author: 'HashSpring Research',
    emoji: '🔥',
    tags: ['Bitcoin', 'Halving', 'BullRun', 'CycleAnalysis', '2025', '2026'],
  },
  {
    id: 'crypto-market-cycle-2025-2026-analysis',
    title: 'Crypto Market Cycle Analysis 2025–2026: Which Phase Are We In?',
    excerpt: 'A comprehensive framework for identifying where the crypto market stands in its cycle — using fear/greed, dominance shifts, altcoin rotation, and macro signals.',
    content: [
      'Understanding where we are in the crypto market cycle is the most important edge an investor can have. The 2025–2026 cycle follows a well-established four-phase structure: accumulation, early bull, late bull, and distribution. Correctly identifying the current phase determines strategy.',
      'As of Q1 2026, multiple indicators suggest we are in the late accumulation to early bull transition phase. Bitcoin dominance remains elevated at ~58%, which historically precedes the main altcoin season. The Fear & Greed Index has averaged 65 over the past 30 days — "Greed" territory, but far from the extreme greed (85+) that signals a top.',
      'The altcoin market is showing selective strength. Large-cap alts (ETH, SOL, BNB) have begun outperforming, while small-caps remain subdued — a hallmark of the early bull phase where capital rotates from BTC to large-cap alts first.',
      'Funding rates across derivatives exchanges remain moderate (0.01–0.03% per 8 hours), indicating the market is not yet overleveraged. Prior cycle tops were characterized by persistent funding rates above 0.1%, signaling excessive speculation.',
      'The most reliable leading indicators pointing to continued upside: stablecoin supply growth (more dry powder entering the ecosystem), increasing active addresses on major chains, and rising institutional participation via regulated products.',
      'Strategy for the current phase: Maintain core BTC/ETH positions (50–60% of portfolio), begin selective altcoin allocation in sectors with strong fundamentals (DeFi, AI/DePIN, RWA), and set trailing stop-losses. Avoid over-leveraging — the next 6–12 months will have significant volatility on both sides.',
    ],
    category: 'Market',
    date: 'Apr 1, 2026',
    readTime: '9 min read',
    author: 'HashSpring Research',
    emoji: '🌐',
    tags: ['CryptoMarket', 'CycleAnalysis', 'Altcoins', 'Strategy', '2025', '2026'],
  },
  {
    id: 'bitcoin-price-cycle-peak-prediction-2026',
    title: 'Bitcoin Price Cycle Peak: On-Chain Evidence for the 2025–2026 Top',
    excerpt: 'Six on-chain metrics that have accurately called every Bitcoin cycle top — and what they say about the 2026 peak.',
    content: [
      'Timing the cycle peak is notoriously difficult, but on-chain metrics offer objective signals that have proven remarkably accurate across Bitcoin\'s history. Here are six key indicators to monitor as we approach the potential 2026 top.',
      'MVRV Z-Score: Currently at 4.2. Historically, readings above 7 mark cycle tops (peaked at 7.5 in 2021, 8.1 in 2017). We have significant room to run before this signals a top.',
      'NUPL (Net Unrealized Profit/Loss): Currently in the "belief" phase at 0.57. The "euphoria" phase (0.75+) typically accompanies cycle peaks. Watch for transition to euphoria as a warning signal.',
      'Realized Price Ratio (RPR): Long-term holders\' average acquisition cost is approximately $35,000. When price exceeds 4x the realized price (implying $140,000+), historical tops have followed within 3–6 months.',
      'Exchange Netflow: Sustained outflows from exchanges (coins moving to cold storage) indicate accumulation. Current 30-day netflow is negative $2.1B — bullish. A sudden shift to positive netflow (selling pressure) would be a red flag.',
      'Miner Revenue/Cost Ratio: Post-halving, miners operate near breakeven at current prices. As prices rise, miner profitability increases and they tend to sell more to lock in profits. Watch for sustained daily miner selling above 1,000 BTC.',
      'Stablecoin Supply Ratio (SSR): The lower the SSR, the more buying power (stablecoins) exists relative to Bitcoin market cap. Current SSR of 12 leaves substantial room for stablecoin-driven buying before the market becomes saturated.',
    ],
    category: 'Bitcoin',
    date: 'Mar 31, 2026',
    readTime: '8 min read',
    author: 'HashSpring Research',
    emoji: '📈',
    tags: ['Bitcoin', 'OnChain', 'PricePrediction', 'CycleTop', '2026'],
  },
  {
    id: 'solana-ethereum-l2-comparison-2025-2026',
    title: 'Solana vs Ethereum L2s in 2025–2026: The Battle for Smart Contract Dominance',
    excerpt: 'Developer activity, TVL trends, transaction costs, and ecosystem momentum — who wins the L1/L2 war in the current cycle?',
    content: [
      'The competition for smart contract platform dominance has never been more intense. Solana\'s high-throughput architecture and low fees have attracted significant developer talent, while Ethereum\'s L2 ecosystem has matured into a formidable stack. Understanding the trade-offs is critical for investors and builders.',
      'Solana\'s performance metrics are impressive: 65,000+ TPS in real-world conditions, sub-cent transaction fees, and a growing DeFi ecosystem now surpassing $12B in TVL. The Firedancer validator client, developed by Jump Crypto, promises to push performance to 1M+ TPS while significantly improving network reliability.',
      'Ethereum\'s L2 ecosystem — led by Arbitrum, Optimism, Base, and ZKsync — collectively processes more transactions than Ethereum mainnet. The Pectra upgrade\'s blob capacity increase has further reduced L2 fees, with some chains achieving near-zero costs. Total Ethereum ecosystem TVL (L1 + L2) remains dominant at $85B+.',
      'Developer sentiment is split. Solana attracts developers who want simplicity and speed — building consumer apps, meme coins, and high-frequency DeFi. Ethereum L2s attract developers who prioritize EVM compatibility, composability, and the deepest liquidity pools.',
      'The verdict for investors: both ecosystems will likely succeed in 2026, but they serve different use cases. SOL benefits from a concentrated ecosystem where rising tide lifts all boats. ETH ecosystem returns are more fragmented across L2 tokens, infrastructure plays, and the ETH asset itself.',
    ],
    category: 'Ethereum',
    date: 'Mar 30, 2026',
    readTime: '7 min read',
    author: 'HashSpring Research',
    emoji: '⚡',
    tags: ['Solana', 'Ethereum', 'L2', 'Comparison', '2025', '2026'],
  },
  {
    id: 'crypto-market-cycle-analysis-2024-2025-2026',
    title: 'Full Crypto Market Cycle 2024–2025–2026: From Accumulation to Euphoria',
    excerpt: 'A year-by-year breakdown of the current macro crypto cycle, tracing the journey from post-FTX lows to where we go from here.',
    content: [
      '2024 marked the beginning of one of the most significant recovery arcs in crypto history. Starting from the post-FTX bear market lows, Bitcoin climbed from $16,000 to nearly $100,000 — a 525% return driven by ETF approvals, the halving event, and improving macro conditions.',
      '2025 began with consolidation as the market digested the explosive 2024 gains. Bitcoin traded in the $80,000–$100,000 range through Q1, frustrating late entrants but providing long-term holders with a strong base. Ethereum underperformed relative to BTC, trading at historically low ETH/BTC ratios — a setup that historically precedes significant ETH outperformance.',
      'The altcoin market in 2025 showed selective rotation. AI/DePIN tokens (Render, Akash, io.net) surged on real fundamental demand. RWA tokens gained institutional adoption. Meanwhile, legacy DeFi tokens struggled to recapture 2021 highs as newer, more capital-efficient protocols took market share.',
      '2026 Q1–Q2: The data suggests we are entering the most dynamic phase of the cycle. Bitcoin is testing new all-time highs, institutional demand from ETFs and corporate treasuries provides structural support, and retail FOMO (fear of missing out) is beginning but not yet at peak. This is historically the period of the highest risk-adjusted returns.',
      'Historical cycle data points to a peak in Q3–Q4 2026, likely in the $120,000–$180,000 range for Bitcoin. Ethereum should reach $6,000–$10,000 in this scenario. Altcoins, as always, will present a mix of 10x winners and 90% losers — research and sector selection are paramount.',
      'The most important lesson from studying full market cycles: the biggest gains happen in the 6–12 months before the top, not at the bottom. Patience during accumulation and discipline during euphoria are the two most valuable traits a cycle investor can have.',
    ],
    category: 'Market',
    date: 'Mar 28, 2026',
    readTime: '11 min read',
    author: 'HashSpring Research',
    emoji: '🔄',
    tags: ['CryptoMarket', 'FullCycle', '2024', '2025', '2026', 'Bitcoin', 'Altcoins'],
  },
];

const analysisZh: AnalysisArticle[] = [
  {
    id: 'btc-cycle-analysis',
    title: '比特幣週期分析：2025-2026 牛市我們走到哪裡了？',
    excerpt: '深入研究鏈上指標、減半週期和機構採用模式，預測比特幣的下一步走勢。',
    content: [
      '比特幣已進入許多分析師認為的四年週期中最爆發性的階段。繼 2024 年 4 月減半後，供應減少加上前所未有的機構需求，形成了價格上漲的完美風暴。',
      '鏈上數據展現了引人注目的故事。MVRV Z-Score（衡量市場價值與實現價值比率的指標）目前為 4.2 — 歷史上超過 7 的讀數標誌著週期頂部。這表明仍有顯著的上行空間。',
      '機構採用從根本上改變了市場結構。現貨 ETF 總計持有超過 120 萬 BTC，主權財富基金開始配置，需求端從未如此強勁。',
      '然而，風險仍然存在。聯準會貨幣政策走向、潛在的監管打壓，以及始終存在的黑天鵝事件威脅，都可能破壞牛市論點。審慎的風險管理仍然至關重要。',
      '我們的基本預期週期峰值目標為 $120,000-$150,000，在極端情景下可能超過 $180,000。時間線指向 2026 年 Q3 末或 Q4。',
    ],
    category: '比特幣',
    date: '2026年3月27日',
    readTime: '8分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '📊',
    tags: ['比特幣', '週期分析', '鏈上', 'ETF'],
  },
  {
    id: 'eth-pectra-impact',
    title: '以太坊 Pectra 升級：對可擴展性和質押的影響',
    excerpt: '解析以太坊最新重大升級的技術改進和經濟影響。',
    content: [
      'Pectra 升級代表以太坊路線圖的下一個重要里程碑。結合 Prague（執行層）和 Electra（共識層）升級，在帳戶抽象、驗證者操作和數據可用性方面帶來重大改進。',
      'EIP-7702 引入原生帳戶抽象機制，允許外部擁有帳戶（EOA）臨時採用智能合約功能。這通過啟用 Gas 贊助、批次交易和社交恢復大幅改善用戶體驗。',
      '對於驗證者，MAX_EFFECTIVE_BALANCE 提升至 2048 ETH 意味著大型運營商可以合併驗證者，減少網路開銷並提高效率。獨立質押者受益於獎勵的自動複利。',
      '通過 EIP-7594（PeerDAS）的數據可用性改進增加了 blob 容量，將 L2 交易成本降低約 40-60%。這使以太坊 rollup 相比替代 L1 更具競爭力。',
    ],
    category: '以太坊',
    date: '2026年3月26日',
    readTime: '6分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '💎',
    tags: ['以太坊', 'Pectra', '質押', 'L2'],
  },
  {
    id: 'defi-real-yield',
    title: '真實收益崛起：真正產生營收的 DeFi 協議',
    excerpt: '超越代幣激勵挖礦 — 哪些 DeFi 協議正在構建可持續的商業模式？',
    content: [
      'DeFi 生態自 2020-2021 年的流動性挖礦狂熱以來已顯著成熟。如今，最有價值的協議是那些從實際用戶活動中產生真實營收的協議。',
      '走在前列的是 Uniswap，每日手續費收入超過 500 萬美元。最近推出的 v4 及其 Hook 系統吸引了創新開發者構建自定義 AMM 邏輯。',
      'Aave 和 Compound 已發展成為鏈上借貸的骨幹，合計 TVL 超過 300 億美元。其真實收益來自借款人和貸款人之間的利率差。',
      'RWA（真實世界資產）領域可能代表最重要的增長方向。將美國國債、公司債券和房地產代幣化的協議正在以有意義的方式橋接 TradFi 和 DeFi。',
    ],
    category: 'DeFi',
    date: '2026年3月25日',
    readTime: '7分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '🌾',
    tags: ['DeFi', '真實收益', '營收', 'RWA'],
  },
  {
    id: 'ai-crypto-convergence',
    title: 'AI x Crypto：重塑兩個行業的融合趨勢',
    excerpt: '去中心化 AI 網路、鏈上推理和代幣化算力如何創造新範式。',
    content: [
      'AI 和加密貨幣的交叉已成為當前週期最引人注目的敘事之一。在炒作之外，真正的基礎設施正在建設中，可能從根本上改變 AI 模型的訓練、部署和變現方式。',
      'Render、Akash 和 io.net 等去中心化算力網路正在創建 GPU 資源市場。隨著 AI 訓練成本飆升，這些網路提供了相對於中心化雲服務商的低成本替代方案。',
      '鏈上 AI 代理代表另一個前沿。Autonolas 和 Fetch.ai 等項目正在構建可以與 DeFi 協議交互、執行交易和管理投資組合的自主代理框架。',
      '關鍵挑戰仍然是延遲和吞吐量。當前的區塊鏈基礎設施難以滿足 AI 推理的即時需求。結合鏈下計算和鏈上驗證的解決方案正在出現。',
    ],
    category: 'AI',
    date: '2026年3月24日',
    readTime: '6分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '🤖',
    tags: ['AI', 'DePIN', '算力', '代理'],
  },
  {
    id: 'global-regulation-map',
    title: '2026 全球加密監管：逐國全面指南',
    excerpt: '從歐盟 MiCA 到美國穩定幣法案 — 追蹤塑造行業的監管格局。',
    content: [
      '2026 年全球加密貨幣監管格局已達到拐點。主要司法管轄區正從探索性框架轉向具體、可執行的法規。',
      '歐盟的 MiCA 法規第二階段已全面生效，創建了全球最全面的加密監管框架。CASP（加密資產服務提供商）許可證現已成為強制要求，並有嚴格的資本要求和消費者保護措施。',
      '在美國，兩黨穩定幣法案終於通過，為美元掛鉤代幣提供了監管清晰度。同時，SEC 和 CFTC 繼續就現貨市場監管權進行管轄權爭議。',
      '亞洲呈現分化格局。日本和新加坡以進步框架領先，中國維持禁令。香港以其新的許可制度成為重要的加密中心。',
    ],
    category: '監管',
    date: '2026年3月23日',
    readTime: '10分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '⚖️',
    tags: ['監管', 'MiCA', '政策', '合規'],
  },
  {
    id: 'bitcoin-halving-bull-run-2024-2025-2026',
    title: '比特幣減半週期與牛市時間線：2024–2026 完整路線圖',
    excerpt: '歷史減半數據、鏈上信號與市場結構分析，清晰呈現 2026 年當前牛市進程。',
    content: [
      '每四年一次的比特幣減半將區塊獎勵削減一半，大幅減少新幣供應。2024 年 4 月的減半將每日發行量從 900 BTC 降至 450 BTC——歷史上，這一供應衝擊通常在 6–18 個月後引發最強勁的牛市行情。',
      '回顧 2012、2016、2020 年三次減半週期，規律高度一致：減半後的積累期、隨後的拋物線上漲、最終的爆頂。基於週期時間，2024 年減半指向的頂部窗口為 2026 年 Q3–Q4。',
      '鏈上指標支持這一判斷。普爾倍數（衡量礦工日收入相對於 365 日均值的比率）目前處於「買入區域」1.3，與前幾輪牛市的中期讀數一致。與此同時，長期持有者（LTH）仍積極持幣，LTH 供應量處於多年高位。',
      '宏觀背景提供了額外的順風。聯準會的降息週期，加上史無前例的 ETF 需求（高峰時每週流入超 20 億美元），帶來了前幾輪週期從未有過的需求底部。這一結構性變化可能意味著 2026 年峰值將超越歷史所有「價格對週期頂」的比率。',
      '需重點關注的關鍵風險事件：聯準會利率決策走向、美國潛在監管行動，以及影響風險偏好的地緣政治動向。宏觀衝擊可能推遲（但大概率不會終結）週期頂部的到來。',
      '2025–2026 週期頂部目標價格區間：$120,000–$180,000，基本情景為 $150,000。圍繞比特幣主導地位趨勢把握入場時機——當山寨幣開始大幅跑贏時，週期頂部通常在 3–6 個月後到來。',
    ],
    category: '比特幣',
    date: '2026年4月2日',
    readTime: '10分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '🔥',
    tags: ['比特幣', '減半', '牛市', '週期分析', '2025', '2026'],
  },
  {
    id: 'crypto-market-cycle-2025-2026-analysis',
    title: '加密市場週期分析 2025–2026：我們處於哪個階段？',
    excerpt: '一套識別加密市場週期位置的完整框架——涵蓋恐懼/貪婪指數、主導地位轉換、山寨輪動與宏觀信號。',
    content: [
      '判斷加密市場週期所處位置是投資者最重要的優勢。2025–2026 週期遵循成熟的四階段結構：積累、早期牛市、晚期牛市與分發。正確識別當前階段決定了策略選擇。',
      '截至 2026 年 Q1，多項指標顯示我們正處於晚期積累向早期牛市的過渡階段。比特幣主導率維持在約 58% 的高位，這在歷史上先於主要山寨季的到來。過去 30 天的恐懼貪婪指數均值為 65 ——「貪婪」區域，但距離通常預示頂部的極度貪婪（85+）仍有距離。',
      '山寨幣市場正呈現選擇性強勢。大市值山寨（ETH、SOL、BNB）已開始跑贏，而小市值幣種仍受壓——這是早期牛市的典型特徵，資金從 BTC 先輪動到大市值山寨。',
      '衍生品交易所的資金費率維持溫和（每 8 小時 0.01–0.03%），表明市場尚未過度槓桿。前幾輪週期頂部的特徵是持續高於 0.1% 的資金費率，顯示過度投機。',
      '指向持續上漲的最可靠領先指標：穩定幣供應量增長（更多乾糧進入生態）、主要鏈上活躍地址數上升、以及通過合規產品參與的機構資金持續增加。',
      '當前階段的策略建議：保持 BTC/ETH 核心倉位（50–60% 的組合），開始選擇性配置基本面強勁的山寨賽道（DeFi、AI/DePIN、RWA），並設置追蹤止損。避免過度槓桿——未來 6–12 個月雙向波動將非常劇烈。',
    ],
    category: '市場',
    date: '2026年4月1日',
    readTime: '9分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '🌐',
    tags: ['加密市場', '週期分析', '山寨幣', '策略', '2025', '2026'],
  },
  {
    id: 'bitcoin-price-cycle-peak-prediction-2026',
    title: '比特幣價格週期頂部：鏈上證據指向 2025–2026 峰值',
    excerpt: '六個準確預測每次比特幣週期頂部的鏈上指標——以及它們對 2026 年峰值的啟示。',
    content: [
      '準確判斷週期頂部極為困難，但鏈上指標提供了在比特幣歷史中已被驗證的客觀信號。以下是隨著 2026 年潛在頂部臨近需要重點監控的六個關鍵指標。',
      'MVRV Z-Score：當前為 4.2。歷史上，超過 7 的讀數標誌著週期頂部（2021 年峰值 7.5，2017 年峰值 8.1）。在此指標發出頂部信號之前，仍有相當大的上漲空間。',
      'NUPL（凈未實現盈虧）：當前處於「信念」階段，值為 0.57。「狂喜」階段（0.75+）通常伴隨週期頂部出現。警惕向狂喜階段的過渡作為預警信號。',
      '實現價格比率（RPR）：長期持有者的平均成本約為 35,000 美元。當價格超過實現價格 4 倍（即超過 140,000 美元）時，歷史頂部通常在 3–6 個月後跟隨。',
      '交易所淨流量：持續的交易所流出（幣種轉移至冷錢包）顯示積累信號。當前 30 天淨流量為負 21 億美元——看漲。突然轉為正流量（拋售壓力）將是紅色警報。',
      '礦工收入/成本比：減半後，礦工在當前價格附近接近盈虧平衡。隨著價格上漲，礦工盈利能力提升，往往增加拋售以鎖定利潤。關注礦工每日持續拋售超過 1,000 BTC 的情況。',
      '穩定幣供應比率（SSR）：SSR 越低，相對於比特幣市值存在的購買力（穩定幣）越多。當前 SSR 為 12，在市場飽和之前，仍有大量由穩定幣驅動的購買空間。',
    ],
    category: '比特幣',
    date: '2026年3月31日',
    readTime: '8分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '📈',
    tags: ['比特幣', '鏈上', '價格預測', '週期頂', '2026'],
  },
  {
    id: 'solana-ethereum-l2-comparison-2025-2026',
    title: 'Solana vs 以太坊 L2：2025–2026 智能合約霸主之戰',
    excerpt: '開發者活躍度、TVL 趨勢、交易成本與生態系統動能——誰在本輪週期的 L1/L2 之戰中勝出？',
    content: [
      '智能合約平台霸主的競爭從未如此激烈。Solana 的高吞吐量架構和低廉費用已吸引大量開發者，而以太坊的 L2 生態系統已成熟為強大的技術棧。理解兩者的取捨對投資者和建設者至關重要。',
      'Solana 的性能指標令人印象深刻：真實環境下超過 65,000 TPS、低於一美分的交易費用，以及 DeFi 生態 TVL 已突破 120 億美元。由 Jump Crypto 開發的 Firedancer 驗證客戶端有望將性能推至 100 萬+ TPS，同時顯著提升網路可靠性。',
      '以太坊的 L2 生態——以 Arbitrum、Optimism、Base 和 ZKsync 為首——處理的交易量已超過以太坊主網。Pectra 升級的 blob 容量提升進一步降低了 L2 費用，部分鏈已實現近乎為零的成本。以太坊生態系統（L1 + L2）的總 TVL 仍以 850 億美元以上保持主導。',
      '開發者情緒分化。Solana 吸引注重簡單性和速度的開發者——構建消費者應用、模因幣和高頻 DeFi。以太坊 L2 吸引優先考慮 EVM 兼容性、可組合性和最深流動性池的開發者。',
      '投資者的結論：2026 年兩個生態系統都可能成功，但服務於不同的使用場景。SOL 受益於高度集中的生態，水漲船高效應明顯。以太坊生態的收益更分散於 L2 代幣、基礎設施項目和 ETH 資產本身。',
    ],
    category: '以太坊',
    date: '2026年3月30日',
    readTime: '7分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '⚡',
    tags: ['Solana', '以太坊', 'L2', '比較', '2025', '2026'],
  },
  {
    id: 'crypto-market-cycle-analysis-2024-2025-2026',
    title: '加密市場完整週期 2024–2025–2026：從積累到狂喜',
    excerpt: '逐年拆解當前宏觀加密週期，從 FTX 後的低谷到現在再到接下來的走勢。',
    content: [
      '2024 年標誌著加密史上最重要的復甦弧線之一的開始。從 FTX 事件後的熊市低點出發，比特幣從 16,000 美元攀升至近 100,000 美元——由 ETF 獲批、減半事件和宏觀環境改善共同驅動的 525% 漲幅。',
      '2025 年以整固開始，市場消化 2024 年的爆發式漲幅。比特幣在 Q1 期間在 80,000–100,000 美元區間震盪，讓晚入場者倍感沮喪，但也為長期持有者提供了堅實的基礎。以太坊相對比特幣表現遜色，ETH/BTC 比率處於歷史低位——這在歷史上往往先於 ETH 的顯著跑贏階段。',
      '2025 年的山寨幣市場呈現選擇性輪動。AI/DePIN 代幣（Render、Akash、io.net）在真實基本面需求的推動下飆升。RWA 代幣獲得機構採用。與此同時，傳統 DeFi 代幣難以重現 2021 年的高點，更高資本效率的新協議搶佔了市場份額。',
      '2026 Q1–Q2：數據顯示我們正進入週期最具活力的階段。比特幣測試新的歷史高點，來自 ETF 和企業國庫的機構需求提供了結構性支撐，散戶 FOMO（害怕錯過）開始出現但尚未達到頂峰。這在歷史上是風險調整後回報最高的時期。',
      '歷史週期數據指向 2026 年 Q3–Q4 的頂部，比特幣可能在 $120,000–$180,000 範圍內見頂。在此情景下，以太坊應達到 $6,000–$10,000。山寨幣一如既往，將出現 10 倍贏家和 90% 輸家的混合局面——研究和賽道選擇至關重要。',
      '研究完整市場週期的最重要啟示：最大的收益發生在頂部前的 6–12 個月，而非在底部。積累期的耐心和狂喜期的紀律是週期投資者最寶貴的兩種特質。',
    ],
    category: '市場',
    date: '2026年3月28日',
    readTime: '11分鐘閱讀',
    author: 'HashSpring 研究院',
    emoji: '🔄',
    tags: ['加密市場', '完整週期', '2024', '2025', '2026', '比特幣', '山寨幣'],
  },
];

export function getAnalysisArticles(locale: string): AnalysisArticle[] {
  return locale === 'zh' ? analysisZh : analysisEn;
}
