# SOP-002: 文章正文生成与展示

> 编号: SOP-002 | 版本: 1.0 | 更新: 2026-03-29

## 流程概述

```
Worker抓取新闻 → AI生成中英双语正文(body_zh/body_en) → 存入Supabase → 前端API返回body字段 → 详情页直接展示
```

## 正文生成规则

| 项目 | 要求 |
|------|------|
| 段数 | 3段 |
| 中文字数 | 300-500字 |
| 英文字数 | 200-400 words |
| 第1段 | 核心事件（谁做了什么） |
| 第2段 | 关键细节、数据、背景 |
| 第3段 | 市场影响或后续展望 |
| 末尾 | 必须包含：原文來源：{source}（{link}） |
| 品牌名 | 不翻译：LBank, Binance, OKX, Bybit, Bitget 等 |

## 数据库字段

| 字段 | 类型 | 说明 |
|------|------|------|
| body_zh | text | AI生成的繁体中文正文 |
| body_en | text | AI生成的英文正文 |
| analysis | text | 1-2句市场影响分析 |
| comment | text | 编辑点评(80-120字) |

## 详情页读取优先级

1. **body_zh / body_en**（Supabase预生成）← 主要来源
2. `/api/article-summary`（实时抓原文+AI生成）← 兜底方案
3. 占位文字（"該消息由...報導"）← 最终兜底

## 关键文件

| 文件 | 职责 |
|------|------|
| `worker/ai.js` → `aiGenerateBody()` | 生成中英双语正文 |
| `worker/index.js` → step 4.5 | 调用aiGenerateBody |
| `src/app/api/flash-news/route.ts` | 返回body字段 |
| `src/app/[locale]/flash/[id]/FlashDetailClient.tsx` | 展示正文 |
| `src/app/api/article-summary/route.ts` | 兜底：实时AI摘要 |

## 常见故障

| 故障 | 原因 | 修复 |
|------|------|------|
| 详情页无正文 | Supabase无body_en/body_zh列 | 执行SQL添加列 |
| 正文只有英文 | zhBody生成失败 | 检查AI API调用日志 |
| 正文无原文链接 | AI未按指令生成 | 检查ai.js的prompt |
| 兜底方案也失败 | 原文站反爬 | 正常，依赖主方案 |

## Supabase 建表 SQL（如缺少字段）

```sql
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_zh TEXT;
```
