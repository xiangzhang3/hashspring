# SOP-001: 内容抓取与发布管线

> 编号: SOP-001 | 版本: 1.0 | 更新: 2026-03-29

## 流程概述

```
35+ 源抓取 → 12h过滤 → 去重(content_hash) → 交易所限流 → AI翻译标题 → AI生成正文(body_en/body_zh) → AI分析+点评 → 写入Supabase → 网站自动显示
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `worker/index.js` | 主管线，循环执行抓取→AI→写入 |
| `worker/sources.js` | 35+数据源定义和抓取函数 |
| `worker/ai.js` | AI翻译/分析/点评/正文生成 |
| `worker/.env` | 配置：API Key、抓取间隔 |
| `src/app/api/flash-news/route.ts` | 前端API，从Supabase读取数据 |

## 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| FETCH_INTERVAL | 3 | 抓取循环间隔（秒） |
| isRunning锁 | 自动 | 防止并发执行 |
| 内容时效 | 12小时 | 超过12h的旧内容自动过滤 |
| 每批写入 | 50条 | 避免payload过大 |

## 交易所限流规则

| 交易所 | 规则 |
|--------|------|
| Bitget | 4h内最多1条，优先：上线 > 功能 > 下架 |
| LBank | 4h内只推送上线信息 |
| Binance/OKX/Bybit | 不限流 |

## 常见故障

| 故障 | 排查 | 修复 |
|------|------|------|
| 0条新内容 | 检查网络、源是否挂了 | 重启worker，检查sources.js |
| Supabase写入失败 | 检查字段名匹配 | 对比Supabase表结构和records |
| AI翻译/正文失败 | 检查ANTHROPIC_API_KEY | 确认.env中key有效 |
| 详情页无正文 | body_en/body_zh为空 | 检查aiGenerateBody是否执行 |

## 启动命令

```bash
cd worker && npm install && node index.js
```
