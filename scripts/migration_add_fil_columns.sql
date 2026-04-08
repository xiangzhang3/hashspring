-- HashSpring: Add Filipino translation columns
-- Run this in Supabase Dashboard > SQL Editor BEFORE running translate_articles.py

-- Articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_html_fil TEXT;

-- Flash news table
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS description_fil TEXT;
