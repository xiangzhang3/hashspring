#!/usr/bin/env python3
"""
Insert the BTC Cycle Analysis article into the Supabase articles table
with slug 'btc-cycle-analysis' and full SEO optimization.
"""
from __future__ import annotations
import json
import ssl
import urllib.request

SUPABASE_URL = "https://skfpuzlnhkoyifewvisz.supabase.co"
SUPABASE_KEY = "sb_secret_Q171Gz1WVTsdXa_WZ7ndww_vexjbhXH"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# ── Check if already exists ──
check_url = f"{SUPABASE_URL}/rest/v1/articles?slug=eq.btc-cycle-analysis&select=id,slug,title"
req = urllib.request.Request(check_url, headers={
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
})
with urllib.request.urlopen(req, context=ctx) as resp:
    existing = json.loads(resp.read())
    if existing:
        print(f"Article already exists: id={existing[0]['id']}, slug={existing[0]['slug']}")
        print("Updating it instead...")
        # Update the existing article
        article_id = existing[0]['id']
        update_mode = True
    else:
        update_mode = False

# ── Article data ──
content_html = """
<p>比特币已进入许多分析师认为的四年周期中最具爆发性的阶段。继 2024 年 4 月减半后，供应减少与前所未有的机构需求相叠加，形成了价格上涨的完美风暴。</p>

<h2>链上数据信号</h2>

<p>链上数据展现了引人注目的图景。MVRV Z-Score（衡量市场价值与实现价值比率的指标）目前为 4.2 — 历史上超过 7 的读数通常标志着周期顶部。这表明仍存在显著的上行空间。</p>

<p>长期持有者（LTH）的持仓行为同样值得关注。当前 LTH 净头寸变化显示，长期持有者正以温和的速度减持，这种模式在历史上对应牛市的中后期，距离大规模抛售顶部仍有距离。</p>

<p>交易所净流出持续保持正值，意味着更多比特币正从交易所流出到冷钱包，表明持有者倾向于长期储存而非短期交易。</p>

<h2>机构采用：市场结构变革</h2>

<p>机构采用已从根本上改变了市场结构。现货 ETF 总计持有超过 120 万 BTC，主权财富基金开始配置，需求端从未如此强劲。</p>

<p>BlackRock 的 iShares Bitcoin Trust（IBIT）已成为历史上增长最快的 ETF 产品，管理资产规模突破 500 亿美元。Fidelity、Ark Invest 等机构管理的 BTC ETF 同样吸引了大量资金流入。</p>

<p>值得注意的是，养老基金和保险公司等传统保守型机构投资者也开始将比特币纳入资产配置，这标志着加密资产从另类投资向主流资产类别的重要转变。</p>

<h2>减半周期分析</h2>

<p>从历史周期来看，比特币在每次减半后的 12-18 个月内通常会经历最显著的价格增长：</p>

<ul>
<li><strong>2012 年减半</strong>：减半后 12 个月上涨约 8,000%</li>
<li><strong>2016 年减半</strong>：减半后 18 个月上涨约 2,800%</li>
<li><strong>2020 年减半</strong>：减半后 18 个月上涨约 600%</li>
<li><strong>2024 年减半</strong>：截至目前，减半后已上涨约 120%，若按递减规律推算，仍有可观的上行空间</li>
</ul>

<p>每个周期的回报率呈递减趋势，但绝对涨幅依然显著。当前周期正处于减半后 12 个月的关键窗口期。</p>

<h2>宏观环境与风险因素</h2>

<p>然而，风险依然存在。美联储货币政策走向、潜在的监管打压，以及始终存在的黑天鹅事件威胁，都可能破坏牛市论点。审慎的风险管理仍然至关重要。</p>

<p>具体的风险因素包括：</p>

<ul>
<li>全球流动性收紧可能抑制风险资产估值</li>
<li>主要经济体对加密货币的监管政策不确定性</li>
<li>稳定币监管框架的变化可能影响市场流动性</li>
<li>地缘政治风险引发的市场避险情绪</li>
</ul>

<h2>价格预测与时间线</h2>

<p>综合链上数据、机构资金流向、减半周期规律和宏观环境，我们的基本预期如下：</p>

<p><strong>基准情景</strong>（概率 50%）：周期峰值 $120,000 - $150,000，时间窗口 2026 年 Q3-Q4。</p>

<p><strong>乐观情景</strong>（概率 25%）：在极端 FOMO 和杠杆推动下，价格可能在短期内冲高至 $180,000 以上，形成典型的 blow-off top。</p>

<p><strong>保守情景</strong>（概率 25%）：若宏观环境恶化或出现重大监管利空，周期峰值可能仅达到 $90,000 - $110,000。</p>

<h2>投资策略建议</h2>

<p>对于不同风险偏好的投资者，我们建议：</p>

<ul>
<li><strong>保守型</strong>：维持 BTC 现货仓位，在 MVRV Z-Score 接近 6 时开始分批减仓</li>
<li><strong>平衡型</strong>：核心仓位持有 BTC 和 ETH，适度配置主流 DeFi 代币，设定移动止盈</li>
<li><strong>激进型</strong>：在核心仓位基础上适当使用杠杆，但总杠杆率不超过 2x，严格止损</li>
</ul>

<p><em>免责声明：本文仅为研究分析，不构成投资建议。加密货币投资具有高度风险，请根据个人风险承受能力谨慎决策。</em></p>
"""

content_html_en = """
<p>Bitcoin has entered what many analysts consider the most explosive phase of its four-year cycle. Following the April 2024 halving, the reduced supply issuance combined with unprecedented institutional demand has created a perfect storm for price appreciation.</p>

<h2>On-Chain Data Signals</h2>

<p>On-chain data tells a compelling story. The MVRV Z-Score, which measures the ratio of market value to realized value, currently sits at 4.2 — historically, readings above 7 have signaled cycle tops. This suggests significant upside potential remains.</p>

<p>Long-term holder (LTH) behavior is equally noteworthy. The current LTH net position change indicates long-term holders are distributing at a moderate pace — a pattern historically corresponding to the mid-to-late bull market phase, still distant from a major distribution top.</p>

<p>Exchange net outflows continue to remain positive, meaning more Bitcoin is flowing out of exchanges into cold wallets, indicating holders prefer long-term storage over short-term trading.</p>

<h2>Institutional Adoption: A Structural Shift</h2>

<p>Institutional adoption has fundamentally changed the market structure. With spot ETFs collectively holding over 1.2 million BTC and sovereign wealth funds beginning allocation, the demand side of the equation has never been stronger.</p>

<p>BlackRock's iShares Bitcoin Trust (IBIT) has become the fastest-growing ETF product in history, surpassing $50 billion in assets under management. BTC ETFs managed by Fidelity, Ark Invest, and others have similarly attracted significant capital inflows.</p>

<p>Notably, traditionally conservative institutional investors such as pension funds and insurance companies have also begun incorporating Bitcoin into their asset allocation, marking an important transition from alternative investment to mainstream asset class.</p>

<h2>Halving Cycle Analysis</h2>

<p>Historically, Bitcoin has experienced its most significant price appreciation in the 12-18 months following each halving:</p>

<ul>
<li><strong>2012 Halving</strong>: ~8,000% gain in the 12 months following</li>
<li><strong>2016 Halving</strong>: ~2,800% gain in the 18 months following</li>
<li><strong>2020 Halving</strong>: ~600% gain in the 18 months following</li>
<li><strong>2024 Halving</strong>: ~120% gain so far — if the diminishing returns pattern holds, considerable upside remains</li>
</ul>

<p>While returns diminish each cycle, the absolute gains remain substantial. The current cycle is in the critical 12-month window following the halving.</p>

<h2>Macro Environment and Risk Factors</h2>

<p>However, risks remain. The Federal Reserve's monetary policy trajectory, potential regulatory crackdowns, and the ever-present threat of black swan events could derail the bull thesis. Prudent risk management remains essential.</p>

<p>Specific risk factors include:</p>

<ul>
<li>Global liquidity tightening could suppress risk asset valuations</li>
<li>Regulatory policy uncertainty across major economies</li>
<li>Changes to stablecoin regulatory frameworks may impact market liquidity</li>
<li>Geopolitical risk-driven market risk-off sentiment</li>
</ul>

<h2>Price Forecast and Timeline</h2>

<p>Combining on-chain data, institutional flows, halving cycle patterns, and the macro environment, our base projections are as follows:</p>

<p><strong>Base Case</strong> (50% probability): Cycle peak at $120,000 - $150,000, with the timeline pointing to late Q3 or Q4 2026.</p>

<p><strong>Bull Case</strong> (25% probability): Under extreme FOMO and leverage, prices could spike to $180,000+ in a classic blow-off top scenario.</p>

<p><strong>Bear Case</strong> (25% probability): If macro conditions deteriorate or a major regulatory headwind emerges, the cycle peak may only reach $90,000 - $110,000.</p>

<h2>Investment Strategy Recommendations</h2>

<p>For investors with different risk profiles, we recommend:</p>

<ul>
<li><strong>Conservative</strong>: Maintain BTC spot positions, begin scaling out as MVRV Z-Score approaches 6</li>
<li><strong>Balanced</strong>: Hold core positions in BTC and ETH, moderate allocation to leading DeFi tokens, set trailing take-profits</li>
<li><strong>Aggressive</strong>: Use moderate leverage on top of core positions (max 2x total leverage), with strict stop-losses</li>
</ul>

<p><em>Disclaimer: This article is for research and analysis purposes only and does not constitute investment advice. Cryptocurrency investing carries a high degree of risk. Please make decisions based on your personal risk tolerance.</em></p>
"""

article = {
    "slug": "btc-cycle-analysis",
    "title": "2025-2026年比特币市场周期分析：我们正处于牛市的哪个阶段？",
    "title_en": "Bitcoin Cycle Analysis: Where Are We in the 2025-2026 Bull Run?",
    "excerpt": "深入研究链上指标、MVRV Z-Score、减半周期规律和机构采用趋势，分析比特币当前所处的市场阶段，展望 2025-2026 年周期峰值预测。",
    "excerpt_en": "A deep dive into on-chain metrics, MVRV Z-Score, halving cycle patterns, and institutional adoption trends to analyze where Bitcoin stands in its current market cycle, with 2025-2026 peak projections.",
    "content": "比特币已进入许多分析师认为的四年周期中最具爆发性的阶段...",
    "content_html": content_html.strip(),
    "content_en": "Bitcoin has entered what many analysts consider the most explosive phase of its four-year cycle...",
    "content_html_en": content_html_en.strip(),
    "cover_image": "",
    "category": "analysis",
    "author": "HashSpring Research",
    "tags": ["Bitcoin", "CycleAnalysis", "OnChain", "ETF", "HalvingCycle", "MVRV", "InstitutionalAdoption"],
    "locale": "zh",
    "source": "hashspring",
    "source_url": "",
    "is_published": True,
    "published_at": "2026-03-27T10:00:00+08:00",
    "read_time": 10,
    "char_count": len(content_html.strip()),
    "views": 0,
}

data = json.dumps(article, ensure_ascii=False).encode("utf-8")

if update_mode:
    # PATCH existing
    patch_url = f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}"
    req = urllib.request.Request(patch_url, data=data, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json; charset=utf-8",
        "Prefer": "return=representation",
    })
else:
    # INSERT new
    insert_url = f"{SUPABASE_URL}/rest/v1/articles"
    req = urllib.request.Request(insert_url, data=data, method="POST", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json; charset=utf-8",
        "Prefer": "return=representation",
    })

with urllib.request.urlopen(req, context=ctx) as resp:
    result = json.loads(resp.read())
    if isinstance(result, list) and result:
        r = result[0]
        print(f"SUCCESS: Article {'updated' if update_mode else 'inserted'}")
        print(f"  id:   {r['id']}")
        print(f"  slug: {r['slug']}")
        print(f"  title: {r['title']}")
        print(f"  URL:  https://www.hashspring.com/en/analysis/btc-cycle-analysis")
        print(f"  URL:  https://www.hashspring.com/zh/analysis/btc-cycle-analysis")
    else:
        print("Result:", result)
