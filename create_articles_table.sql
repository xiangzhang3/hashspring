-- ============================================================
-- hashspring.com articles 表 (Supabase)
-- 用于存储从 tuoniaox.com 迁移的文章及未来新文章
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,                    -- URL slug
  title         TEXT NOT NULL,                           -- 文章标题
  excerpt       TEXT DEFAULT '',                         -- 摘要/简介 (列表页显示)
  content       TEXT DEFAULT '',                         -- 纯文本正文
  content_html  TEXT DEFAULT '',                         -- HTML 正文
  cover_image   TEXT DEFAULT '',                         -- 封面图 URL
  category      TEXT DEFAULT 'analysis',                 -- 分类: analysis, news, tutorial
  author        TEXT DEFAULT '鸵鸟区块链',                -- 作者名
  tags          TEXT[] DEFAULT '{}',                     -- 标签数组
  locale        TEXT DEFAULT 'zh',                       -- 语言: zh, en
  source        TEXT DEFAULT '',                         -- 来源: tuoniaox, hashspring, etc.
  source_url    TEXT DEFAULT '',                         -- 原始 URL
  original_id   INTEGER,                                 -- 原始文章 ID (tuoniaox p-xxx)
  published_at  TIMESTAMPTZ,                             -- 原始发布时间
  migrated_at   TIMESTAMPTZ DEFAULT NOW(),               -- 迁移时间
  char_count    INTEGER DEFAULT 0,                       -- 字数
  read_time     INTEGER DEFAULT 0,                       -- 预估阅读时间(分钟)
  views         INTEGER DEFAULT 0,                       -- 浏览次数
  is_featured   BOOLEAN DEFAULT FALSE,                   -- 是否置顶/精选
  is_published  BOOLEAN DEFAULT TRUE,                    -- 是否已发布
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_locale ON articles(locale);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_source ON articles(source);
CREATE INDEX idx_articles_is_published ON articles(is_published);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- 组合索引：列表页查询优化
CREATE INDEX idx_articles_list ON articles(category, locale, is_published, published_at DESC);

-- 启用 RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Public read access" ON articles
  FOR SELECT USING (is_published = TRUE);

-- 服务端写入策略 (service key)
CREATE POLICY "Service insert" ON articles
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service update" ON articles
  FOR UPDATE USING (TRUE);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();

-- ============================================================
-- 说明:
-- 1. 在 Supabase Dashboard → SQL Editor 中运行此脚本
-- 2. 运行 tuoniaox_scraper.py 抓取文章
-- 3. 运行 tuoniaox_importer.py 导入到此表
-- ============================================================
