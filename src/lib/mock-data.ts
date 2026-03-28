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
];

export function getAnalysisArticles(locale: string): AnalysisArticle[] {
  return locale === 'zh' ? analysisZh : analysisEn;
}
