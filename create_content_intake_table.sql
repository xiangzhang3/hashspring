-- ============================================================
-- HashSpring unified content intake table
-- 所有 RSS / 外部抓取内容先进入该表，再由 AI 路由到 flash_news 或 articles
-- ============================================================

CREATE TABLE IF NOT EXISTS content_intake (
  id               BIGSERIAL PRIMARY KEY,
  content_hash     TEXT UNIQUE NOT NULL,
  raw_title        TEXT NOT NULL DEFAULT '',
  raw_description  TEXT DEFAULT '',
  title_en         TEXT,
  title_zh         TEXT,
  body_en          TEXT,
  body_zh          TEXT,
  link             TEXT DEFAULT '',
  source           TEXT DEFAULT '',
  source_type      TEXT DEFAULT 'rss',
  category         TEXT DEFAULT 'Crypto',
  level            TEXT DEFAULT 'blue',
  lang             TEXT DEFAULT 'en',
  pub_date         TIMESTAMPTZ,
  analysis         TEXT,
  comment          TEXT,
  ai_route         TEXT,
  ai_route_reason  TEXT,
  route_status     TEXT DEFAULT 'pending',
  published_target TEXT,
  article_slug     TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_intake_route_status ON content_intake(route_status);
CREATE INDEX IF NOT EXISTS idx_content_intake_ai_route ON content_intake(ai_route);
CREATE INDEX IF NOT EXISTS idx_content_intake_pub_date ON content_intake(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_intake_source ON content_intake(source);

ALTER TABLE content_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content intake" ON content_intake
  FOR SELECT USING (TRUE);

CREATE POLICY "Service insert content intake" ON content_intake
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service update content intake" ON content_intake
  FOR UPDATE USING (TRUE);

CREATE OR REPLACE FUNCTION update_content_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_intake_updated_at ON content_intake;

CREATE TRIGGER content_intake_updated_at
  BEFORE UPDATE ON content_intake
  FOR EACH ROW
  EXECUTE FUNCTION update_content_intake_updated_at();
