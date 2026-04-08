ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT,
  ADD COLUMN IF NOT EXISTS content_html_en TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_title_en ON articles(title_en);
