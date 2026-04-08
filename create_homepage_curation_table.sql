-- ============================================================
-- HashSpring homepage curation slots
-- 用于编辑确认首页头图轮播内容（默认 5 个位置）
-- ============================================================

CREATE TABLE IF NOT EXISTS homepage_curation (
  id            BIGSERIAL PRIMARY KEY,
  locale        TEXT NOT NULL DEFAULT 'zh',
  slot_index    INTEGER NOT NULL,
  article_slug  TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  label         TEXT DEFAULT '',
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(locale, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_homepage_curation_locale_active
  ON homepage_curation(locale, is_active, slot_index);

ALTER TABLE homepage_curation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read homepage curation" ON homepage_curation
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Service insert homepage curation" ON homepage_curation
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service update homepage curation" ON homepage_curation
  FOR UPDATE USING (TRUE);

CREATE OR REPLACE FUNCTION update_homepage_curation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS homepage_curation_updated_at ON homepage_curation;

CREATE TRIGGER homepage_curation_updated_at
  BEFORE UPDATE ON homepage_curation
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_curation_updated_at();
