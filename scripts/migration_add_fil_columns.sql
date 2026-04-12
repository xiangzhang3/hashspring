
-- Add Filipino translation columns to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_html_fil TEXT;

-- Add Filipino translation columns to flash_news table
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS description_fil TEXT;
