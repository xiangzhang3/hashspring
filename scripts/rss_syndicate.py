#!/usr/bin/env python3
"""
HashSpring RSS Syndication Script

Pushes RSS feeds to major news aggregators and syndication hubs:
1. PubSubHubbub (Google) — real-time feed notification
2. Bing Webmaster — ping sitemap + feed
3. IndexNow — push new article URLs
4. Ping-o-Matic — notify blog directories

Usage:
  python3 scripts/rss_syndicate.py              # Push all locales
  python3 scripts/rss_syndicate.py --locale en  # Push specific locale
  python3 scripts/rss_syndicate.py --dry-run    # Preview without sending
"""

import argparse
import json
import sys
import time
from urllib import request, parse, error

SITE = "https://www.hashspring.com"
LOCALES = ["en", "zh", "fil"]
INDEXNOW_KEY = "hashspring2026indexnow"

# ── PubSubHubbub (WebSub) ─────────────────────────────────
# Google and other feed readers subscribe via this protocol
PUBSUBHUBBUB_HUB = "https://pubsubhubbub.appspot.com/"

# ── Ping endpoints ─────────────────────────────────────────
PING_ENDPOINTS = [
    # Ping-o-Matic (notifies Google Blog Search, Bing, etc.)
    "https://rpc.pingomatic.com/",
    # Google ping
    "https://www.google.com/ping?sitemap={sitemap_url}",
    # Bing ping
    "https://www.bing.com/ping?sitemap={sitemap_url}",
]

# ── IndexNow endpoints ─────────────────────────────────────
INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
]


def push_pubsubhubbub(feed_url: str, dry_run: bool = False) -> bool:
    """Notify PubSubHubbub hub that a feed has been updated."""
    data = parse.urlencode({
        "hub.mode": "publish",
        "hub.url": feed_url,
    }).encode("utf-8")

    if dry_run:
        print(f"  [DRY RUN] PubSubHubbub: {feed_url}")
        return True

    try:
        req = request.Request(PUBSUBHUBBUB_HUB, data=data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        resp = request.urlopen(req, timeout=10)
        status = resp.getcode()
        print(f"  ✅ PubSubHubbub ({feed_url}): HTTP {status}")
        return status in (200, 204)
    except error.HTTPError as e:
        print(f"  ❌ PubSubHubbub ({feed_url}): HTTP {e.code}")
        return False
    except Exception as e:
        print(f"  ❌ PubSubHubbub ({feed_url}): {e}")
        return False


def ping_search_engines(locale: str, dry_run: bool = False) -> int:
    """Ping Google and Bing with sitemap URLs."""
    sitemap_url = f"{SITE}/sitemap.xml"
    news_sitemap_url = f"{SITE}/news-sitemap.xml"
    success = 0

    for url_template in PING_ENDPOINTS:
        if "{sitemap_url}" in url_template:
            for smap in [sitemap_url, news_sitemap_url]:
                ping_url = url_template.format(sitemap_url=parse.quote(smap, safe=""))
                if dry_run:
                    print(f"  [DRY RUN] Ping: {ping_url}")
                    success += 1
                    continue
                try:
                    resp = request.urlopen(ping_url, timeout=10)
                    print(f"  ✅ Ping ({smap}): HTTP {resp.getcode()}")
                    success += 1
                except Exception as e:
                    print(f"  ❌ Ping ({smap}): {e}")
        else:
            # XML-RPC ping (Ping-o-Matic)
            site_name = "HashSpring"
            site_url = f"{SITE}/{locale}"
            feed_url = f"{SITE}/{locale}/feed.xml"
            xml_body = f"""<?xml version="1.0"?>
<methodCall>
  <methodName>weblogUpdates.ping</methodName>
  <params>
    <param><value>{site_name}</value></param>
    <param><value>{site_url}</value></param>
    <param><value>{feed_url}</value></param>
  </params>
</methodCall>"""
            if dry_run:
                print(f"  [DRY RUN] XML-RPC ping: {url_template}")
                success += 1
                continue
            try:
                req = request.Request(url_template, data=xml_body.encode("utf-8"), method="POST")
                req.add_header("Content-Type", "text/xml")
                resp = request.urlopen(req, timeout=10)
                print(f"  ✅ XML-RPC ping ({locale}): HTTP {resp.getcode()}")
                success += 1
            except Exception as e:
                print(f"  ❌ XML-RPC ping ({locale}): {e}")

    return success


def push_indexnow(urls: list[str], dry_run: bool = False) -> int:
    """Push URLs to IndexNow endpoints."""
    if not urls:
        return 0

    success = 0
    payload = json.dumps({
        "host": "www.hashspring.com",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE}/{INDEXNOW_KEY}.txt",
        "urlList": urls[:10000],
    }).encode("utf-8")

    for endpoint in INDEXNOW_ENDPOINTS:
        if dry_run:
            print(f"  [DRY RUN] IndexNow ({endpoint}): {len(urls)} URLs")
            success += 1
            continue
        try:
            req = request.Request(endpoint, data=payload, method="POST")
            req.add_header("Content-Type", "application/json")
            resp = request.urlopen(req, timeout=15)
            status = resp.getcode()
            print(f"  ✅ IndexNow ({endpoint}): HTTP {status}, {len(urls)} URLs")
            success += 1
        except error.HTTPError as e:
            print(f"  ❌ IndexNow ({endpoint}): HTTP {e.code}")
        except Exception as e:
            print(f"  ❌ IndexNow ({endpoint}): {e}")
        time.sleep(1)

    return success


def build_article_urls(locales: list[str]) -> list[str]:
    """Build list of key page URLs to push via IndexNow."""
    urls = []

    for loc in locales:
        # Core pages
        urls.append(f"{SITE}/{loc}")
        urls.append(f"{SITE}/{loc}/flashnews")
        urls.append(f"{SITE}/{loc}/analysis")
        urls.append(f"{SITE}/{loc}/market")
        urls.append(f"{SITE}/{loc}/trending")
        urls.append(f"{SITE}/{loc}/feed.xml")

    # Sitemaps
    urls.append(f"{SITE}/sitemap.xml")
    urls.append(f"{SITE}/news-sitemap.xml")

    return urls


def main():
    parser = argparse.ArgumentParser(description="HashSpring RSS Syndication")
    parser.add_argument("--locale", choices=LOCALES, help="Push specific locale only")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    args = parser.parse_args()

    locales = [args.locale] if args.locale else LOCALES
    dry_run = args.dry_run

    print("=" * 60)
    print("HashSpring RSS Syndication")
    print(f"Locales: {', '.join(locales)}")
    print(f"Dry run: {dry_run}")
    print("=" * 60)

    # ── Step 1: PubSubHubbub ──────────────────────────────
    print("\n📡 Step 1: PubSubHubbub (WebSub) notifications...")
    for loc in locales:
        feed_url = f"{SITE}/{loc}/feed.xml"
        push_pubsubhubbub(feed_url, dry_run)

    # ── Step 2: Ping search engines ───────────────────────
    print("\n🔔 Step 2: Ping search engines (sitemap + XML-RPC)...")
    for loc in locales:
        ping_search_engines(loc, dry_run)

    # ── Step 3: IndexNow ──────────────────────────────────
    print("\n🚀 Step 3: IndexNow push...")
    urls = build_article_urls(locales)
    print(f"  Pushing {len(urls)} URLs...")
    push_indexnow(urls, dry_run)

    # ── Summary ───────────────────────────────────────────
    print("\n" + "=" * 60)
    print("✅ Syndication complete!")
    print()
    print("📋 Next steps (manual):")
    print("  1. Google News Publisher Center:")
    print("     https://publishercenter.google.com/")
    print(f"     → Add publication, RSS: {SITE}/en/feed.xml")
    print()
    print("  2. Bing Webmaster Tools:")
    print("     https://www.bing.com/webmasters/")
    print(f"     → Submit sitemap: {SITE}/sitemap.xml")
    print()
    print("  3. Apple News (optional):")
    print("     https://developer.apple.com/news-publisher/")
    print(f"     → Register with RSS: {SITE}/en/feed.xml")
    print()
    print("  4. Flipboard (optional):")
    print("     https://share.flipboard.com/publisher/")
    print(f"     → Add RSS: {SITE}/en/feed.xml")
    print("=" * 60)


if __name__ == "__main__":
    main()
