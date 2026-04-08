#!/usr/bin/env python3
"""
HashSpring Translation Coverage Report
Checks how many articles/flash_news have EN and FIL translations.

Usage: python3 scripts/translation_coverage.py
"""

import json
import os
import urllib.request
import urllib.parse
import ssl
from pathlib import Path

env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def count_rows(table, filters=None):
    qs = urllib.parse.urlencode({"select": "id", "limit": "1", **(filters or {})})
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "count=exact",
    })
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        rng = resp.headers.get("content-range", "")
        total = rng.split("/")[1] if "/" in rng else "0"
        return int(total)


def pct(part, total):
    return f"{part / total * 100:.1f}%" if total > 0 else "N/A"


def main():
    print("=" * 60)
    print("📊 HashSpring Translation Coverage Report")
    print("=" * 60)

    # ── Articles ──
    print("\n📚 articles table:")
    total = count_rows("articles", {"is_published": "eq.true"})
    has_en = count_rows("articles", {"is_published": "eq.true", "title_en": "not.is.null"})
    try:
        has_fil = count_rows("articles", {"is_published": "eq.true", "title_fil": "not.is.null"})
    except Exception:
        has_fil = 0  # column may not exist yet
    no_en = total - has_en
    no_fil = total - has_fil

    print(f"  Total published:    {total}")
    print(f"  Has title_en:       {has_en} ({pct(has_en, total)})")
    print(f"  Missing title_en:   {no_en} ({pct(no_en, total)})")
    print(f"  Has title_fil:      {has_fil} ({pct(has_fil, total)})")
    print(f"  Missing title_fil:  {no_fil} ({pct(no_fil, total)})")

    # ── Flash news ──
    print("\n⚡ flash_news table:")
    total_f = count_rows("flash_news")
    has_en_f = count_rows("flash_news", {"title_en": "not.is.null"})
    try:
        has_fil_f = count_rows("flash_news", {"title_fil": "not.is.null"})
    except Exception:
        has_fil_f = 0
    no_en_f = total_f - has_en_f
    no_fil_f = total_f - has_fil_f

    print(f"  Total:              {total_f}")
    print(f"  Has title_en:       {has_en_f} ({pct(has_en_f, total_f)})")
    print(f"  Missing title_en:   {no_en_f} ({pct(no_en_f, total_f)})")
    print(f"  Has title_fil:      {has_fil_f} ({pct(has_fil_f, total_f)})")
    print(f"  Missing title_fil:  {no_fil_f} ({pct(no_fil_f, total_f)})")

    # ── Summary ──
    total_all = total + total_f
    translated_en = has_en + has_en_f
    translated_fil = has_fil + has_fil_f

    print("\n" + "=" * 60)
    print(f"📈 Overall: {total_all} total items")
    print(f"   EN coverage: {translated_en}/{total_all} ({pct(translated_en, total_all)})")
    print(f"   FIL coverage: {translated_fil}/{total_all} ({pct(translated_fil, total_all)})")
    print(f"   Remaining EN: {total_all - translated_en}")
    print(f"   Remaining FIL: {total_all - translated_fil}")
    print("=" * 60)


if __name__ == "__main__":
    main()
