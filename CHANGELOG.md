# HashSpring Changelog

> 本文件记录 HashSpring 生产版本的重要更新。时间默认使用北京时间（UTC+8）。

## 2026-10-02 — CMS 恢复与快讯站重构启动

### 当前阶段
- 恢复 GitHub → Vercel 自动部署链路
- 确认现有 Next.js / Supabase / 快讯抓取基础设施仍可复用
- 启动 HashSpring 向「Crypto Breaking News / 加密行业实时快讯站」重构

### 已完成
- 新增 `/admin` Newsroom CMS 第一版
- 新增后台登录 API
- 新增快讯 CMS CRUD API：查询、新增、编辑、删除
- 支持 Breaking / Important / Flash 三级重要度
- 支持标题、正文/摘要、来源、分类、原始 URL 管理
- `/admin` 从 locale middleware 中独立，避免被重定向到 `/en/admin`
- 清除当前 worker 源码中的硬编码 Supabase Service Key，改为服务器环境变量读取

### 安全待办
- Vercel 配置 `ADMIN_PASSWORD`
- Supabase 轮换历史上曾暴露在 Git 记录中的 Service Key

### 下一阶段
- 重构中文首页为「快讯第一」的信息流布局
- 增加编辑审核/待发布队列
- 恢复并拆分自动新闻采集流水线
- 建立 Breaking News / CEX / Regulation & ETF / RWA & TradFi / AI × Crypto / Onchain Skills
