# SOP-004: SEO URL 与排序规则

> 编号: SOP-004 | 版本: 1.0 | 更新: 2026-03-29

## URL 格式

| 类型 | 格式 | 示例 |
|------|------|------|
| 快讯详情 | `/{locale}/flash/{slug}-{hash}` | `/zh/flash/bitcoin-surges-past-95k-a3f2b1c` |
| 分类页 | `/{locale}/category/{slug}` | `/zh/category/btc` |
| 快讯列表 | `/{locale}/flashnews` | `/zh/flashnews` |

## Slug 生成规则

1. 取英文标题 (`title_en`)
2. 转小写，去特殊字符
3. 空格转连字符
4. 截取前60字符
5. 追加短hash保证唯一性

## 排序规则

- **严格按发布时间倒序**（最新在最前面）
- **不按重要级别(level)重排**
- 详见 `flash-news/route.ts` 中的注释

## 关键文件

| 文件 | 职责 |
|------|------|
| `src/app/api/flash-news/route.ts` → `generateSeoSlug()` | 生成SEO slug |
| `src/components/FlashFeed.tsx` | 使用slug构建href |
| `src/app/[locale]/flash/[id]/page.tsx` | 详情页路由 |
