-- HashSpring: Full-text search indexes for fast keyword matching
-- Run in Supabase Dashboard > SQL Editor
-- Replaces slow ilike queries with tsvector + GIN indexes

-- ══════════════════════════════════════════════════════
-- flash_news: combined search vector (title + body)
-- ══════════════════════════════════════════════════════

-- Add search vector column
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate with combined content (English config for word stemming)
UPDATE flash_news SET search_vector =
  setweight(to_tsvector('english', coalesce(title_en, '') || ' ' || coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body_en, '') || ' ' || coalesce(body_zh, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C');

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_flash_news_search ON flash_news USING GIN (search_vector);

-- Auto-update trigger: keep search_vector in sync on INSERT/UPDATE
CREATE OR REPLACE FUNCTION flash_news_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title_en, '') || ' ' || coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body_en, '') || ' ' || coalesce(NEW.body_zh, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flash_news_search ON flash_news;
CREATE TRIGGER trg_flash_news_search
  BEFORE INSERT OR UPDATE OF title, title_en, title_zh, body_en, body_zh, description
  ON flash_news
  FOR EACH ROW EXECUTE FUNCTION flash_news_search_update();

-- ══════════════════════════════════════════════════════
-- articles: combined search vector (title + excerpt + content)
-- ══════════════════════════════════════════════════════

ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE articles SET search_vector =
  setweight(to_tsvector('english', coalesce(title_en, '') || ' ' || coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(excerpt_en, '') || ' ' || coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(content_en, '') || ' ' || coalesce(content, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION articles_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title_en, '') || ' ' || coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt_en, '') || ' ' || coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content_en, '') || ' ' || coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_articles_search ON articles;
CREATE TRIGGER trg_articles_search
  BEFORE INSERT OR UPDATE OF title, title_en, excerpt, excerpt_en, content, content_en
  ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_search_update();

-- ══════════════════════════════════════════════════════
-- Also add basic ilike indexes as fallback for CJK
-- (tsvector 'english' config doesn't tokenize Chinese well)
-- ══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_flash_news_title_trgm ON flash_news USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_flash_news_title_en_trgm ON flash_news USING GIN (title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_title_en_trgm ON articles USING GIN (title_en gin_trgm_ops);

-- NOTE: trigram indexes require the pg_trgm extension:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Run this first if the trigram indexes fail.
