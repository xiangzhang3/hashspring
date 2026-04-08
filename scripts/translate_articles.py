#!/usr/bin/env python3
"""
HashSpring Batch Translation Script
Translates articles and flash_news from Chinese to English + Filipino.
All translations are saved to Supabase (pre-translated, not real-time).

Usage:
  python3 scripts/translate_articles.py              # translate both tables
  python3 scripts/translate_articles.py articles      # articles only
  python3 scripts/translate_articles.py flash         # flash_news only
  python3 scripts/translate_articles.py --dry-run     # preview without writing

Requires: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY in .env.local or env
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import ssl
import re
from pathlib import Path

# ── Load .env.local ──
env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

assert ANTHROPIC_API_KEY, "Missing ANTHROPIC_API_KEY"
assert SUPABASE_URL, "Missing SUPABASE_URL"
assert SUPABASE_KEY, "Missing SUPABASE_SERVICE_KEY"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

DRY_RUN = "--dry-run" in sys.argv
BATCH_SIZE = 5  # articles per Claude API call
SLEEP_BETWEEN = 1  # seconds between API calls


# ══════════════════════════════════════════════════════════════
# Supabase helpers
# ══════════════════════════════════════════════════════════════

def supabase_get(table, params):
    qs = urllib.parse.urlencode(params)
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return json.loads(resp.read())


def supabase_patch(table, match_col, match_val, data):
    """Update a single row in Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{urllib.parse.quote(str(match_val))}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return resp.status


# ══════════════════════════════════════════════════════════════
# Claude translation
# ══════════════════════════════════════════════════════════════

def call_claude(system_prompt, user_prompt, max_tokens=4096):
    """Call Claude API for translation."""
    body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        method="POST",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        result = json.loads(resp.read())
        return result["content"][0]["text"]


def translate_text(texts, target_lang):
    """
    Translate a batch of texts to target language.
    texts: list of {"id": ..., "title": ..., "content": ...}
    target_lang: "en" or "fil"
    Returns: list of {"id": ..., "title": ..., "content": ...}
    """
    lang_name = "English" if target_lang == "en" else "Filipino (Tagalog)"

    system = f"""You are a professional crypto/blockchain translator. Translate Chinese text to {lang_name}.
Rules:
- Keep crypto terms (Bitcoin, Ethereum, DeFi, NFT, etc.) in English
- Keep numbers, symbols, URLs unchanged
- Keep HTML tags intact if present
- Maintain the original tone and structure
- For Filipino: use natural Tagalog with common English loanwords for technical terms
- Return ONLY valid JSON array, no markdown fences"""

    items = []
    for t in texts:
        content_preview = (t.get("content") or "")[:2000]  # limit to avoid token overflow
        items.append({
            "id": t["id"],
            "title": t.get("title", ""),
            "content": content_preview,
        })

    user_prompt = f"""Translate these items to {lang_name}. Return a JSON array with same structure:
[{{"id": "...", "title": "translated title", "content": "translated content"}}]

Input:
{json.dumps(items, ensure_ascii=False)}"""

    result = call_claude(system, user_prompt, max_tokens=8192)

    # Parse JSON from response (handle possible markdown fences)
    result = result.strip()
    if result.startswith("```"):
        result = re.sub(r'^```\w*\n?', '', result)
        result = re.sub(r'\n?```$', '', result)

    return json.loads(result)


# ══════════════════════════════════════════════════════════════
# Articles translation
# ══════════════════════════════════════════════════════════════

def translate_articles():
    print("\n" + "=" * 60)
    print("📚 Translating articles table")
    print("=" * 60)

    # Step 1: Add columns if missing (Supabase will ignore if exists via PATCH)
    # We'll handle missing columns gracefully

    # Step 2: Fetch articles that need EN translation (have Chinese title, no title_en)
    print("\n📖 Fetching articles needing English translation...")
    try:
        en_needed = supabase_get("articles", {
            "select": "id,slug,title,excerpt,content",
            "is_published": "eq.true",
            "title_en": "is.null",
            "order": "published_at.desc",
            "limit": "500",
        })
    except Exception as e:
        print(f"  ⚠ Error fetching: {e}")
        # Try without title_en filter (column might not exist)
        try:
            en_needed = supabase_get("articles", {
                "select": "id,slug,title,excerpt,content",
                "is_published": "eq.true",
                "order": "published_at.desc",
                "limit": "500",
            })
        except Exception as e2:
            print(f"  ✗ Failed: {e2}")
            return

    # Filter to Chinese-only articles
    def has_chinese(text):
        return bool(text and re.search(r'[\u4e00-\u9fff]', text))

    cn_articles = [a for a in en_needed if has_chinese(a.get("title"))]
    print(f"  Found {len(cn_articles)} Chinese articles needing translation")

    if not cn_articles:
        print("  ✓ All articles already translated!")
        return

    # Step 3: Translate in batches
    total_en = 0
    total_fil = 0

    for i in range(0, len(cn_articles), BATCH_SIZE):
        batch = cn_articles[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(cn_articles) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"\n  Batch {batch_num}/{total_batches} ({len(batch)} articles)...")

        items = [{
            "id": str(a["id"]),
            "title": a.get("title", ""),
            "content": a.get("excerpt") or (a.get("content") or "")[:1500],
        } for a in batch]

        # Translate to English
        try:
            en_results = translate_text(items, "en")
            for orig, translated in zip(batch, en_results):
                if DRY_RUN:
                    print(f"    [DRY] {orig['title'][:40]} → {translated.get('title', '')[:40]}")
                else:
                    supabase_patch("articles", "id", orig["id"], {
                        "title_en": translated.get("title", ""),
                        "excerpt_en": translated.get("content", ""),
                    })
                total_en += 1
            print(f"    ✓ EN: {len(en_results)} translated")
        except Exception as e:
            print(f"    ✗ EN failed: {e}")

        time.sleep(SLEEP_BETWEEN)

        # Translate to Filipino
        try:
            fil_results = translate_text(items, "fil")
            for orig, translated in zip(batch, fil_results):
                if DRY_RUN:
                    print(f"    [DRY-FIL] {orig['title'][:40]} → {translated.get('title', '')[:40]}")
                else:
                    supabase_patch("articles", "id", orig["id"], {
                        "title_fil": translated.get("title", ""),
                        "excerpt_fil": translated.get("content", ""),
                    })
                total_fil += 1
            print(f"    ✓ FIL: {len(fil_results)} translated")
        except Exception as e:
            print(f"    ✗ FIL failed: {e}")

        time.sleep(SLEEP_BETWEEN)

    print(f"\n📊 Articles done: {total_en} EN + {total_fil} FIL translations saved")


# ══════════════════════════════════════════════════════════════
# Flash news translation
# ══════════════════════════════════════════════════════════════

def translate_flash():
    print("\n" + "=" * 60)
    print("⚡ Translating flash_news table")
    print("=" * 60)

    # flash_news already has title_en, title_zh, body_en, body_zh
    # Need to: 1) fill missing EN translations, 2) add FIL translations

    # Fetch flash_news with Chinese title but no English title
    print("\n📖 Fetching flash news needing English translation...")
    try:
        rows = supabase_get("flash_news", {
            "select": "id,content_hash,title,title_en,title_zh,body_en,body_zh,description",
            "title_en": "is.null",
            "order": "pub_date.desc",
            "limit": "500",
        })
    except Exception:
        # Fallback: get all and filter
        try:
            rows = supabase_get("flash_news", {
                "select": "id,content_hash,title,title_en,title_zh,body_en,body_zh,description",
                "order": "pub_date.desc",
                "limit": "1000",
            })
            rows = [r for r in rows if not r.get("title_en")]
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            return

    def has_chinese(text):
        return bool(text and re.search(r'[\u4e00-\u9fff]', text))

    cn_flash = [r for r in rows if has_chinese(r.get("title") or r.get("title_zh"))]
    print(f"  Found {len(cn_flash)} flash news needing EN translation")

    total_en = 0
    total_fil = 0

    for i in range(0, len(cn_flash), BATCH_SIZE):
        batch = cn_flash[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(cn_flash) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"\n  Batch {batch_num}/{total_batches} ({len(batch)} items)...")

        items = [{
            "id": str(r["id"]) if r.get("id") else r.get("content_hash", ""),
            "title": r.get("title") or r.get("title_zh") or "",
            "content": r.get("body_zh") or r.get("description") or "",
        } for r in batch]

        # English
        try:
            en_results = translate_text(items, "en")
            for orig, translated in zip(batch, en_results):
                match_col = "id" if orig.get("id") else "content_hash"
                match_val = orig.get("id") or orig.get("content_hash")
                if DRY_RUN:
                    t_orig = (orig.get("title") or "")[:30]
                    t_new = translated.get("title", "")[:30]
                    print(f"    [DRY] {t_orig} → {t_new}")
                else:
                    supabase_patch("flash_news", match_col, match_val, {
                        "title_en": translated.get("title", ""),
                        "body_en": translated.get("content", ""),
                    })
                total_en += 1
            print(f"    ✓ EN: {len(en_results)} translated")
        except Exception as e:
            print(f"    ✗ EN failed: {e}")

        time.sleep(SLEEP_BETWEEN)

        # Filipino
        try:
            fil_results = translate_text(items, "fil")
            for orig, translated in zip(batch, fil_results):
                match_col = "id" if orig.get("id") else "content_hash"
                match_val = orig.get("id") or orig.get("content_hash")
                if DRY_RUN:
                    t_orig = (orig.get("title") or "")[:30]
                    t_new = translated.get("title", "")[:30]
                    print(f"    [DRY-FIL] {t_orig} → {t_new}")
                else:
                    supabase_patch("flash_news", match_col, match_val, {
                        "title_fil": translated.get("title", ""),
                        "body_fil": translated.get("content", ""),
                    })
                total_fil += 1
            print(f"    ✓ FIL: {len(fil_results)} translated")
        except Exception as e:
            print(f"    ✗ FIL failed: {e}")

        time.sleep(SLEEP_BETWEEN)

    print(f"\n📊 Flash news done: {total_en} EN + {total_fil} FIL translations saved")


# ══════════════════════════════════════════════════════════════
# Supabase schema migration — add fil columns
# ══════════════════════════════════════════════════════════════

def add_fil_columns():
    """Add Filipino translation columns to both tables via Supabase SQL."""
    print("\n🔧 Adding Filipino columns to database...")

    # We use Supabase REST API to attempt PATCH with fil fields.
    # If columns don't exist, we need to add them via SQL.
    # Since we can't run SQL directly via REST, we'll create a migration script.

    migration_sql = """
-- Add Filipino translation columns to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fil TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_html_fil TEXT;

-- Add Filipino translation columns to flash_news table
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS title_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS body_fil TEXT;
ALTER TABLE flash_news ADD COLUMN IF NOT EXISTS description_fil TEXT;
"""

    migration_path = Path(__file__).parent / "migration_add_fil_columns.sql"
    migration_path.write_text(migration_sql)
    print(f"  ✓ Migration SQL saved to: {migration_path}")
    print("  ⚠ Run this SQL in Supabase Dashboard > SQL Editor before translating!")
    print("     Or the PATCH calls will silently ignore fil columns.")
    return migration_path


# ══════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("🌐 HashSpring Batch Translation")
    print(f"   Mode: {'DRY RUN' if DRY_RUN else 'LIVE (writing to Supabase)'}")
    print(f"   Batch size: {BATCH_SIZE} | Sleep: {SLEEP_BETWEEN}s")
    print("=" * 60)

    # Generate migration SQL
    add_fil_columns()

    target = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else "both"

    if target in ("articles", "both"):
        translate_articles()

    if target in ("flash", "both"):
        translate_flash()

    print("\n" + "=" * 60)
    print("✅ Translation complete!")
    if DRY_RUN:
        print("   (Dry run — no data was written)")
    else:
        print("   All translations saved to Supabase")
    print("=" * 60)


if __name__ == "__main__":
    main()
