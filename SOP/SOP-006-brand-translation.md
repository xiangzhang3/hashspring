# SOP-006: 品牌名称与翻译规则

> 编号: SOP-006 | 版本: 1.0 | 更新: 2026-03-29

## 不可翻译的品牌名（专有名词）

以下名称在任何翻译中必须保持原文，禁止拆分或翻译：

### 交易所
- Binance, OKX, Bybit, Bitget, LBank, Coinbase, Kraken, Huobi, Gate.io, KuCoin, MEXC, Upbit

### 项目/协议
- Uniswap, Aave, MakerDAO, Compound, Curve, Lido, Rocket Pool, Chainlink, The Graph

### 行业术语（保持原文）
- DeFi, NFT, ETF, L2, TVL, DEX, CEX, DAO, dApp, GameFi, SocialFi, RWA

### 代币符号
- BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, MATIC, LINK, UNI

## 翻译语言规则

| 场景 | 语言 |
|------|------|
| title_zh | 繁体中文（台湾用语） |
| body_zh | 繁体中文（台湾用语） |
| title_en | 英文 |
| body_en | 英文 |

## 禁止行为

- 禁止将 "LBank" 翻译为 "L银行" 或 "L-Bank"
- 禁止将 "Bitget" 翻译为 "比特获取"
- 禁止将 "DeFi" 翻译为 "去中心化金融"（在标题中）
- 禁止将代币符号翻译为中文名称（在标题中）

## 关键文件

| 文件 | 职责 |
|------|------|
| `worker/ai.js` → system prompt | 翻译/正文生成的品牌保护指令 |
| `REQUIREMENTS.md` | 总规则记录 |
