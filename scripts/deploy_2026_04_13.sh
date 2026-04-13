#!/bin/bash
# ── HashSpring 2026-04-13 部署脚本 ──
# 在本地 ~/hashspring-next 目录运行此脚本
set -e

echo "=== Step 1: Clean git lock ==="
rm -f .git/index.lock .git/refs/heads/main.lock
echo "Lock cleared."

echo ""
echo "=== Step 2: Git add + commit ==="
git add \
  src/app/\[locale\]/page.tsx \
  src/app/\[locale\]/analysis/page.tsx \
  src/app/\[locale\]/analysis/\[id\]/page.tsx \
  src/app/api/og/route.tsx \
  src/app/api/revalidate/route.ts \
  src/app/sitemap.ts \
  src/components/ArticleReadingBar.tsx \
  scripts/insert_btc_cycle_article.py \
  scripts/deploy_2026_04_13.sh

git commit -m "feat: homepage analysis + BTC article + SEO + reading bar + ISR revalidate + sitemap split

- Add 'Latest Analysis' section to homepage between carousel and flash feed
- Create dynamic OG image API at /api/og (Edge Runtime, 1200x630)
- Upgrade article detail SEO: NewsArticle JSON-LD, twitter card, robots, keywords
- Add reading progress bar + Table of Contents sidebar for analysis articles
- Add /api/revalidate on-demand ISR webhook (POST scope/paths)
- Split sitemap into 4 sub-sitemaps (static, articles, flash x2)
- Add insert script for btc-cycle-analysis article
- Update pinned featured title to match restored BTC article

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo ""
echo "=== Step 3: Git push ==="
git push origin main
echo "Pushed to origin/main."

echo ""
echo "=== Step 4: Insert BTC cycle analysis article ==="
export SUPABASE_URL="https://skfpuzlnhkoyifewvisz.supabase.co"
export SUPABASE_SERVICE_KEY="sb_secret_Q171Gz1WVTsdXa_WZ7ndww_vexjbhXH"
python3 scripts/insert_btc_cycle_article.py

echo ""
echo "=== ALL DONE ==="
echo "Verify:"
echo "  1. https://hashspring.com/en/analysis/btc-cycle-analysis  (BTC article)"
echo "  2. https://hashspring.com/zh/analysis/btc-cycle-analysis  (Chinese version)"
echo "  3. https://hashspring.com/api/og?title=Bitcoin+Cycle+Analysis&type=analysis  (OG image)"
echo "  4. https://hashspring.com/en  (Homepage 'Latest Analysis' section)"
echo "  5. Open any long analysis article → check reading progress bar + TOC sidebar"
echo "  6. https://hashspring.com/sitemap/0.xml  (static pages sitemap)"
echo "  7. https://hashspring.com/sitemap/1.xml  (articles sitemap)"
echo "  8. https://hashspring.com/api/revalidate?scope=all  (ISR revalidate — needs secret in prod)"
