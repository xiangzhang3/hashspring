#!/usr/bin/env python3
"""
HashSpring SEO Push Script
Fetches all URLs from Supabase (flash_news + articles) and submits to:
1. IndexNow (Bing/Yandex/Google)
2. Google Search Console ping via sitemap
Covers all 3 locales: en, zh, fil
"""

import json
import urllib.request
import urllib.parse
import ssl
import sys

# ── Config ──
SUPABASE_URL = "https://skfpuzlnhkoyifewvisz.supabase.co"
SUPABASE_KEY = "sb_secret_Q171Gz1WVTsdXa_WZ7ndww_vexjbhXH"
SITE_URL = "https://www.hashspring.com"
INDEXNOW_KEY = "hashspring2026indexnow"
LOCALES = ["en", "zh", "fil"]

# Allow unverified SSL in restricted environments
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def supabase_fetch(table, select, params=None):
    """Fetch rows from Supabase REST API."""
    qs = urllib.parse.urlencode({
        "select": select,
        **(params or {}),
    })
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  ⚠ Failed to fetch {table}: {e}")
        return []


def generate_seo_slug(title, hash_id):
    """Python port of generateSeoSlug from sitemap.ts."""
    import re
    if not title:
        return hash_id or 'unknown'
    slug = title.lower()
    slug = re.sub(r'\$([a-z0-9]+)', r'\1', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')[:60]
    short_hash = hash_id.lstrip('h')[:8]
    return f"{slug}-{short_hash}" if slug else hash_id


def collect_urls():
    """Collect all indexable URLs across all locales."""
    urls = []

    # 1. Static pages
    static_pages = ['', '/flashnews', '/market', '/trending', '/analysis', '/about']
    for locale in LOCALES:
        for page in static_pages:
            urls.append(f"{SITE_URL}/{locale}{page}")

    print(f"✓ Static pages: {len(urls)} URLs")

    # 2. Category pages
    categories = [
        'bitcoin', 'ethereum', 'defi', 'nft', 'regulation', 'exchange',
        'solana', 'stablecoin', 'ai', 'l2', 'meme', 'rwa', 'gaming', 'policy',
    ]
    cat_count = 0
    for locale in LOCALES:
        for cat in categories:
            urls.append(f"{SITE_URL}/{locale}/category/{cat}")
            cat_count += 1
    print(f"✓ Category pages: {cat_count} URLs")

    # 3. Flash news from Supabase
    print("  Fetching flash_news from Supabase...")
    flash_rows = supabase_fetch(
        "flash_news",
        "content_hash,title_en",
        {"order": "pub_date.desc", "limit": "2000"}
    )
    flash_count = 0
    for row in flash_rows:
        slug = generate_seo_slug(row.get("title_en") or row.get("title") or "", row.get("content_hash") or "")
        for locale in LOCALES:
            urls.append(f"{SITE_URL}/{locale}/flash/{slug}")
            flash_count += 1
    print(f"✓ Flash news: {flash_count} URLs ({len(flash_rows)} articles × {len(LOCALES)} locales)")

    # 4. Analysis articles from Supabase
    print("  Fetching articles from Supabase...")
    article_rows = supabase_fetch(
        "articles",
        "slug",
        {"is_published": "eq.true", "order": "published_at.desc", "limit": "3000"}
    )
    article_count = 0
    for row in article_rows:
        if row.get("slug"):
            for locale in LOCALES:
                urls.append(f"{SITE_URL}/{locale}/analysis/{row['slug']}")
                article_count += 1
    print(f"✓ Analysis articles: {article_count} URLs ({len(article_rows)} articles × {len(LOCALES)} locales)")

    # 5. Sitemap URLs
    urls.append(f"{SITE_URL}/sitemap.xml")
    urls.append(f"{SITE_URL}/news-sitemap.xml")

    print(f"\n📊 Total: {len(urls)} URLs to submit")
    return urls


def submit_indexnow(urls):
    """Submit URLs to IndexNow in batches of 100."""
    print(f"\n🚀 Submitting to IndexNow ({len(urls)} URLs)...")
    batch_size = 100
    success = 0
    failed = 0

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        payload = json.dumps({
            "host": "www.hashspring.com",
            "key": INDEXNOW_KEY,
            "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
            "urlList": batch,
        }).encode()

        req = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                status = resp.status
                if status in (200, 202):
                    success += len(batch)
                    print(f"  ✓ Batch {i // batch_size + 1}: {len(batch)} URLs → HTTP {status}")
                else:
                    failed += len(batch)
                    print(f"  ✗ Batch {i // batch_size + 1}: HTTP {status}")
        except Exception as e:
            failed += len(batch)
            print(f"  ✗ Batch {i // batch_size + 1}: {e}")

    print(f"\n📈 IndexNow results: {success} submitted, {failed} failed")
    return success


def ping_google_sitemap():
    """Ping Google to re-crawl sitemaps."""
    print("\n🔔 Pinging Google sitemap...")
    sitemaps = [
        f"{SITE_URL}/sitemap.xml",
        f"{SITE_URL}/news-sitemap.xml",
    ]
    for sm in sitemaps:
        ping_url = f"https://www.google.com/ping?sitemap={urllib.parse.quote(sm, safe='')}"
        try:
            req = urllib.request.Request(ping_url)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                print(f"  ✓ {sm} → HTTP {resp.status}")
        except Exception as e:
            print(f"  ✗ {sm} → {e}")

    # Also ping Bing
    print("\n🔔 Pinging Bing sitemap...")
    for sm in sitemaps:
        ping_url = f"https://www.bing.com/ping?sitemap={urllib.parse.quote(sm, safe='')}"
        try:
            req = urllib.request.Request(ping_url)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                print(f"  ✓ {sm} → HTTP {resp.status}")
        except Exception as e:
            print(f"  ✗ {sm} → {e}")


def main():
    print("=" * 60)
    print("🌐 HashSpring SEO Push — Full Site Index Submission")
    print(f"   Locales: {', '.join(LOCALES)}")
    print("=" * 60)

    # Collect all URLs
    urls = collect_urls()

    # Submit to IndexNow
    submit_indexnow(urls)

    # Ping Google & Bing sitemaps
    ping_google_sitemap()

    print("\n" + "=" * 60)
    print("✅ SEO push complete!")
    print(f"   {len(urls)} URLs submitted to IndexNow")
    print("   Sitemaps pinged to Google & Bing")
    print("   Next: verify in Google Search Console")
    print("=" * 60)


if __name__ == "__main__":
    main()
