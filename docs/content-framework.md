# HashSpring Content Framework v1.0

> Last updated: 2026-03-28
> Purpose: Content source architecture, AI production model, SEO strategy

---

## I. Content Source Architecture (三大支柱)

### CS-01: Mainstream Crypto Media (主流加密货币媒体)

| # | Source | Type | URL / Feed | Priority | Language | Update |
|---|--------|------|-----------|----------|----------|--------|
| CS-01-01 | CoinDesk | RSS | coindesk.com/arc/outboundfeeds/rss/ | Tier 1 | EN | Real-time |
| CS-01-02 | CoinTelegraph | RSS | cointelegraph.com/rss | Tier 1 | EN | Real-time |
| CS-01-03 | The Block | RSS | theblock.co/rss.xml | Tier 1 | EN | Real-time |
| CS-01-04 | Decrypt | RSS | decrypt.co/feed | Tier 2 | EN | Real-time |
| CS-01-05 | Bitcoin Magazine | RSS | bitcoinmagazine.com/.rss/full/ | Tier 2 | EN | Real-time |
| CS-01-06 | DL News | RSS | dlnews.com/arc/outboundfeeds/rss/ | Tier 2 | EN | Real-time |
| CS-01-07 | Blockworks | RSS | blockworks.co/feed | Tier 2 | EN | Real-time |
| CS-01-08 | CryptoSlate | RSS | cryptoslate.com/feed/ | Tier 3 | EN | Real-time |
| CS-01-09 | CoinDesk Markets | RSS | coindesk.com/.../category/markets/ | Tier 3 | EN | Real-time |

### CS-02: Exchange Announcements (一线交易所公告)

| # | Source | Type | Content | Priority | Language |
|---|--------|------|---------|----------|----------|
| CS-02-01 | Binance New Listing | API | 新币上线公告 (catalogId=48) | Critical | EN/ZH |
| CS-02-02 | Binance Alpha | API | Alpha 项目上线公告 | High | EN/ZH |
| CS-02-03 | Binance Futures | API | 合约上线公告 (catalogId=130) | High | EN/ZH |
| CS-02-04 | Binance Earn | API | 理财产品公告 | Medium | EN/ZH |
| CS-02-05 | OKX Listing | API | OKX 上币公告 | High | EN/ZH |
| CS-02-06 | Coinbase Listing | RSS/API | Coinbase 上币公告 | High | EN |
| CS-02-07 | Bybit Listing | API | Bybit 上币公告 | Medium | EN |
| CS-02-08 | Upbit Listing | API | Upbit 上币公告 (韩国市场风向标) | Medium | KR/EN |

### CS-03: Chinese Crypto Flash News (中文快讯源)

| # | Source | Type | Content | Priority | Language |
|---|--------|------|---------|----------|----------|
| CS-03-01 | Foresight News | RSS/API | 快讯、深度分析、项目追踪 | Tier 1 | ZH |
| CS-03-02 | BlockBeats | RSS | 律动 BlockBeats 快讯 | Tier 1 | ZH |
| CS-03-03 | PANews | RSS | PANews 快讯 | Tier 2 | ZH |
| CS-03-04 | Odaily | RSS | 星球日报快讯 | Tier 2 | ZH |
| CS-03-05 | ChainCatcher | RSS | 链捕手快讯 | Tier 3 | ZH |

---

## II. AI Content Production Model (AI 内容生产模型)

### AI-01: Translation Pipeline (翻译管线)

```
[EN Source] --> Claude Haiku --> [繁體中文]
[ZH Source] --> Claude Haiku --> [English]
```

- Model: claude-haiku-4-5-20251001 (fast, cost-effective)
- Target: Traditional Chinese (繁體中文)
- Rules: Keep crypto terms in English (DeFi, ETF, BTC, NFT, TVL, etc.)
- Batch: Translate up to 20 titles per API call
- Fallback: Show original language if translation fails

### AI-02: Content Classification (内容分类)

```
[Raw Article] --> Keyword Classifier --> [Category + Level]
```

Level Classification:
- RED (Breaking): surge, crash, hack, exploit, record, all-time, ban, approve, SEC, arrest, collapse, billion
- ORANGE (Important): launch, partner, acquire, funding, regulation, upgrade, airdrop, testnet, mainnet
- BLUE (General): Default for all other news

Category Detection:
- BTC, ETH, DeFi, NFT, L2, Policy, SOL, Stable, AI, Exchange, Meme, Crypto (default)

### AI-03: AI Content Creation (AI 原创内容)

```
[Trending Topic] --> Claude Sonnet --> [Original Article]
```

Use Cases:
1. Daily Market Summary - 每日行情总结 (auto-generated at 00:00 UTC)
2. Weekly Trend Report - 每周趋势报告 (auto-generated on Sunday)
3. Event Analysis - 突发事件分析 (triggered by red-level news)
4. Project Deep Dive - 项目深度分析 (scheduled, editorial review)

Model: claude-sonnet-4-20250514
Output: Bilingual (EN + 繁體中文)
Review: Auto-publish for summaries, editorial review for analysis

### AI-04: SEO Content Optimization (SEO 内容优化)

```
[Article Draft] --> Claude --> [SEO-Optimized Article]
```

- Auto-generate meta title (50-60 chars)
- Auto-generate meta description (150-160 chars)
- Auto-generate URL slug (keyword-rich)
- Auto-insert internal links to related articles
- Auto-generate JSON-LD structured data
- Auto-suggest related tags and categories

---

## III. SEO Strategy (SEO 策略)

### SEO-01: Technical SEO (技术 SEO)

| # | Item | Status | Implementation |
|---|------|--------|---------------|
| SEO-01-01 | Dynamic sitemap.xml | Planned | /sitemap.xml auto-generates from all pages |
| SEO-01-02 | robots.txt | Planned | Allow all crawlers, point to sitemap |
| SEO-01-03 | Canonical URLs | Done | alternates in generateMetadata |
| SEO-01-04 | hreflang tags | Done | en/zh alternates |
| SEO-01-05 | JSON-LD NewsArticle | Done | Flash detail pages |
| SEO-01-06 | JSON-LD WebSite | Planned | Homepage schema |
| SEO-01-07 | JSON-LD BreadcrumbList | Planned | All inner pages |
| SEO-01-08 | Open Graph tags | Done | All pages |
| SEO-01-09 | Twitter Cards | Planned | summary_large_image |
| SEO-01-10 | Core Web Vitals | Planned | LCP < 2.5s, CLS < 0.1 |

### SEO-02: Content SEO (内容 SEO)

| # | Strategy | Description |
|---|----------|-------------|
| SEO-02-01 | Keyword Clusters | Target long-tail crypto keywords per category |
| SEO-02-02 | Internal Linking | Auto-link related flash news and analysis |
| SEO-02-03 | Content Freshness | Real-time updates signal freshness to Google |
| SEO-02-04 | Bilingual Content | Target both EN and ZH search markets |
| SEO-02-05 | Category Pages | /category/btc, /category/defi as SEO landing pages |
| SEO-02-06 | Analysis Pillar Pages | Long-form analysis articles as link magnets |
| SEO-02-07 | FAQ Schema | Add FAQ structured data to analysis pages |

### SEO-03: Target Keywords (目标关键词)

**English Keywords:**
- crypto news, bitcoin news, ethereum news, defi news
- crypto flash news, breaking crypto news, crypto market update
- binance listing, new crypto listing, crypto exchange news
- bitcoin price analysis, ethereum upgrade, defi yield

**Chinese Keywords (繁體):**
- 加密貨幣新聞, 比特幣快訊, 以太坊新聞
- DeFi 最新消息, NFT 新聞, 區塊鏈快訊
- 幣安上幣, 交易所公告, 加密貨幣行情
- 比特幣價格分析, 以太坊升級, 穩定幣新聞

---

## IV. Data Pipeline Architecture (数据管线架构)

```
                    ┌─────────────────┐
                    │   RSS Sources   │ CS-01 (9 feeds)
                    └────────┬────────┘
                             │
┌──────────────┐    ┌────────▼────────┐    ┌─────────────────┐
│   Exchange   │───▶│                 │◀───│  Foresight News │
│  Binance/OKX │    │   Aggregator    │    │  BlockBeats/PA  │
│  CS-02       │    │   API Route     │    │  CS-03          │
└──────────────┘    │  /api/flash-news│    └─────────────────┘
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  AI Classifier  │ Level + Category
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  AI Translator  │ EN ↔ 繁體中文
                    │  Claude Haiku   │
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  EN Site │  │  ZH Site │  │  SEO     │
        │ /en/...  │  │ /zh/...  │  │ sitemap  │
        └──────────┘  └──────────┘  └──────────┘
```

### Refresh Schedule:
- Flash News: Every 5 minutes (Vercel ISR cache)
- Exchange Announcements: Every 10 minutes (Cron Job)
- Market Data: Every 60 seconds (CoinGecko API, client-side)
- AI Summaries: Daily at 00:00 UTC
- Weekly Reports: Sunday 00:00 UTC

---

## V. Implementation Status (实施状态)

| Module | Status | File |
|--------|--------|------|
| RSS Aggregator | Done | /src/app/api/flash-news/route.ts |
| Content Sources Config | Done | /src/lib/api/content-sources.ts |
| Translation Pipeline | Done | /src/lib/api/translate.ts |
| Binance Announcements | Done | Integrated in flash-news route |
| Foresight News | Done | Integrated in flash-news route |
| LiveFlashFeed Component | Done | /src/components/LiveFlashFeed.tsx |
| Category Filter UI | Done | In LiveFlashFeed component |
| Vercel Cron Job | Done | /src/app/api/cron/fetch-news/route.ts |
| Market Data API | In Progress | CoinGecko already integrated |
| SEO Sitemap | Planned | /src/app/sitemap.ts |
| AI Content Creation | Planned | /src/lib/api/ai-writer.ts |
| AI Daily Summary | Planned | /src/app/api/cron/daily-summary/route.ts |

---

## VI. Environment Variables (环境变量)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...          # Claude API for translation & AI content

# Optional
COINGECKO_API_KEY=CG-...              # CoinGecko Pro API (higher rate limits)
CRON_SECRET=your-secret-here          # Vercel Cron authentication
NEXT_PUBLIC_SITE_URL=https://www.hashspring.com
```
