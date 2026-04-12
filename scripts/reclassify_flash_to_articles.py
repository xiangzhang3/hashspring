#!/usr/bin/env python3
"""
Reclassify analysis-like items from flash_news → articles table.

Scans flash_news for items that look like analysis/opinion content,
moves them to the articles table, and optionally deletes the flash originals.

Usage:
    python3 scripts/reclassify_flash_to_articles.py --dry-run    # Preview
    python3 scripts/reclassify_flash_to_articles.py              # Execute
    python3 scripts/reclassify_flash_to_articles.py --delete     # Also remove from flash_news

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
"""
from __future__ import annotations

import os, sys, re, json, argparse
from datetime import datetime, timezone
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Patterns that indicate analysis/opinion content
ANALYSIS_PATTERNS = [
    re.compile(r'\b(analysis|research|report|outlook|deep dive|insight|opinion|commentary)\b', re.I),
    re.compile(r'\b(explained|guide|comprehensive|in-depth|implications|forecast)\b', re.I),
    re.compile(r'\b(undervalued|overvalued|bull case|bear case|long-term|strategy)\b', re.I),
    re.compile(r'\b(what it means|the case for|the future of|way to make|how to protect)\b', re.I),
    re.compile(r'\b(safe from|is .{3,} truly|why .{5,}|should you|could .{3,} become)\b', re.I),
    re.compile(r'(研报|研究|深度|分析|周报|月报|季报|观察|解读|评论|观点|洞察|前瞻|展望|复盘)', re.I),
]


def is_analysis_content(title: str, description: str, body_en: str) -> bool:
    """Check if flash item looks like analysis content."""
    text = f"{title} {description} {body_en or ''}"
    if any(p.search(text) for p in ANALYSIS_PATTERNS):
        return True
    # Long body text is likely analysis
    if len(body_en or '') > 800:
        return True
    if len(description or '') > 500:
        return True
    return False


def make_slug(title: str, content_hash: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", (title or "").lower())
    slug = re.sub(r"\s+", "-", slug).strip("-")[:80]
    short_hash = (content_hash or "").replace("h", "")[:8]
    return f"{slug}-{short_hash}" if slug else f"analysis-{short_hash}"


def supabase_get(path: str) -> list:
    req = Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
    )
    with urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def supabase_post(table: str, data: dict) -> bool:
    body = json.dumps(data).encode("utf-8")
    req = Request(
        f"{SUPABASE_URL}/rest/v1/{table}",
        data=body,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"  ✗ Insert failed: {e}")
        return False


def supabase_delete(table: str, field: str, value: str) -> bool:
    req = Request(
        f"{SUPABASE_URL}/rest/v1/{table}?{field}=eq.{value}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        method="DELETE",
    )
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"  ✗ Delete failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Reclassify flash_news → articles")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    parser.add_argument("--delete", action="store_true", help="Also delete from flash_news after migration")
    parser.add_argument("--limit", type=int, default=200, help="Max flash items to scan (default: 200)")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY")
        sys.exit(1)

    print("=" * 60)
    print("Reclassify flash_news → articles")
    print("=" * 60)

    # Fetch recent flash_news
    print(f"\n📡 Fetching last {args.limit} flash_news items...")
    rows = supabase_get(
        f"flash_news?select=content_hash,title,title_en,title_zh,description,body_en,body_zh,link,source,category,level,pub_date"
        f"&order=pub_date.desc&limit={args.limit}"
    )
    print(f"   Got {len(rows)} items")

    # Find analysis-like items
    candidates = []
    for row in rows:
        title = row.get("title_en") or row.get("title") or ""
        desc = row.get("description") or ""
        body_en = row.get("body_en") or ""
        if is_analysis_content(title, desc, body_en):
            candidates.append(row)

    print(f"   → {len(candidates)} classified as analysis\n")

    if not candidates:
        print("✓ No items to reclassify.")
        return

    # Check which slugs already exist in articles
    existing_slugs = set()
    existing_urls = set()
    try:
        arts = supabase_get("articles?select=slug,source_url&limit=5000")
        existing_slugs = {a["slug"] for a in arts}
        existing_urls = {a.get("source_url", "") for a in arts if a.get("source_url")}
    except Exception as e:
        print(f"  ⚠ Could not fetch existing articles: {e}")

    migrated = 0
    skipped = 0
    for i, row in enumerate(candidates, 1):
        title_en = row.get("title_en") or row.get("title") or "Untitled"
        title_zh = row.get("title_zh") or row.get("title") or ""
        slug = make_slug(title_en, row.get("content_hash", ""))
        link = row.get("link", "")

        # Skip if already in articles
        if slug in existing_slugs or (link and link in existing_urls):
            skipped += 1
            continue

        desc = row.get("description") or ""
        body_en = row.get("body_en") or ""
        body_zh = row.get("body_zh") or ""
        content_text = body_en or desc
        char_count = len(content_text)

        article = {
            "slug": slug,
            "title": title_zh or title_en,
            "title_en": title_en,
            "excerpt": (desc or body_zh)[:500],
            "excerpt_en": (desc or body_en)[:500],
            "content": body_zh or desc,
            "content_html": f"<p>{(body_zh or desc).replace(chr(10), '</p><p>')}</p>",
            "content_en": body_en or "",
            "content_html_en": f"<p>{(body_en or desc).replace(chr(10), '</p><p>')}</p>",
            "cover_image": "",
            "category": "analysis",
            "author": row.get("source") or "HashSpring Desk",
            "tags": [row.get("category", "Crypto")],
            "locale": "zh" if title_zh and any('\u4e00' <= c <= '\u9fff' for c in title_zh) else "en",
            "source": row.get("source", ""),
            "source_url": link,
            "published_at": row.get("pub_date") or datetime.now(timezone.utc).isoformat(),
            "char_count": char_count,
            "read_time": max(1, char_count // 900),
            "is_published": True,
            "is_featured": False,
        }

        print(f"[{i}/{len(candidates)}] {title_en[:60]}...")

        if args.dry_run:
            print(f"   [DRY RUN] → articles/{slug}")
        else:
            if supabase_post("articles", article):
                migrated += 1
                print(f"   ✓ Migrated to articles/{slug}")
                if args.delete:
                    supabase_delete("flash_news", "content_hash", row["content_hash"])
                    print(f"   🗑 Deleted from flash_news")
            else:
                print(f"   ✗ Failed")

    print(f"\n{'=' * 60}")
    if args.dry_run:
        print(f"DRY RUN: {len(candidates) - skipped} would be migrated, {skipped} already exist")
    else:
        print(f"Done: {migrated} migrated, {skipped} already existed")
    print("=" * 60)


if __name__ == "__main__":
    main()
