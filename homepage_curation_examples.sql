-- 示例：配置中文首页 5 篇轮播内容
-- 先把 article_slug 替换成真实文章 slug

INSERT INTO homepage_curation (locale, slot_index, article_slug, label, note, is_active)
VALUES
  ('zh', 1, 'replace-with-article-slug-1', '头条位', '主头条：当天最重要的分析内容', TRUE),
  ('zh', 2, 'replace-with-article-slug-2', '轮播位 2', '第二篇：补充主线叙事', TRUE),
  ('zh', 3, 'replace-with-article-slug-3', '轮播位 3', '第三篇：政策/市场角度', TRUE),
  ('zh', 4, 'replace-with-article-slug-4', '轮播位 4', '第四篇：项目/赛道角度', TRUE),
  ('zh', 5, 'replace-with-article-slug-5', '轮播位 5', '第五篇：深度补充', TRUE)
ON CONFLICT (locale, slot_index)
DO UPDATE SET
  article_slug = EXCLUDED.article_slug,
  label = EXCLUDED.label,
  note = EXCLUDED.note,
  is_active = EXCLUDED.is_active;

-- 示例：配置英文首页 5 篇轮播内容
INSERT INTO homepage_curation (locale, slot_index, article_slug, label, note, is_active)
VALUES
  ('en', 1, 'replace-with-article-slug-1', 'Lead', 'Primary lead story for the day', TRUE),
  ('en', 2, 'replace-with-article-slug-2', 'Rotation 2', 'Secondary supporting story', TRUE),
  ('en', 3, 'replace-with-article-slug-3', 'Rotation 3', 'Policy or market angle', TRUE),
  ('en', 4, 'replace-with-article-slug-4', 'Rotation 4', 'Project or sector angle', TRUE),
  ('en', 5, 'replace-with-article-slug-5', 'Rotation 5', 'Depth or macro follow-up', TRUE)
ON CONFLICT (locale, slot_index)
DO UPDATE SET
  article_slug = EXCLUDED.article_slug,
  label = EXCLUDED.label,
  note = EXCLUDED.note,
  is_active = EXCLUDED.is_active;
