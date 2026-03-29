# SOP-003: Supabase 数据库结构

> 编号: SOP-003 | 版本: 1.0 | 更新: 2026-03-29

## 表: flash_news

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| content_hash | text (PK) | 标题+源的hash，唯一标识 | worker |
| title | text | 原始标题 | worker |
| title_en | text | 英文标题 | AI翻译 |
| title_zh | text | 繁体中文标题 | AI翻译 |
| description | text | 短描述+原文来源标记 | worker |
| body_en | text | 英文完整正文(3段) | AI生成 |
| body_zh | text | 中文完整正文(3段) | AI生成 |
| link | text | 原文URL | worker |
| source | text | 来源名称(如CoinDesk) | worker |
| source_type | text | 类型：rss/exchange/onchain | worker |
| category | text | 分类：BTC/ETH/DeFi等 | AI分类 |
| level | text | 重要级别：red/orange/blue | AI分类 |
| pub_date | timestamptz | 发布时间 | worker |
| analysis | text | AI市场影响分析(1-2句) | AI |
| comment | text | 编辑点评(80-120字) | AI |
| lang | text | 原文语言：en/zh | worker |
| created_at | timestamptz | 写入时间 | 自动 |

## 添加新字段 SQL

```sql
-- SOP-002 要求的正文字段
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_zh TEXT;
```

## 连接信息

| 项 | 值 |
|----|-----|
| URL | https://skfpuzlnhkoyifewvisz.supabase.co |
| Service Key | worker/.env 中的 SUPABASE_SERVICE_KEY |
| 表名 | flash_news |
| 主键 | content_hash |
| 冲突策略 | upsert on content_hash |

## 查询示例

```sql
-- 最新50条快讯
SELECT * FROM flash_news ORDER BY pub_date DESC LIMIT 50;

-- 检查body是否生成
SELECT title, body_en IS NOT NULL as has_body_en, body_zh IS NOT NULL as has_body_zh
FROM flash_news ORDER BY pub_date DESC LIMIT 10;

-- Bitget 4小时内推送记录
SELECT title, pub_date FROM flash_news
WHERE source = 'Bitget' AND pub_date > NOW() - INTERVAL '4 hours'
ORDER BY pub_date DESC;
```
