#!/usr/bin/env python3
"""
HashSpring Analysis Article Ingester

Fetches analysis / opinion articles from crypto RSS feeds,
classifies them, translates via Claude API, and inserts
into the Supabase `articles` table for publishing on /analysis.

Usage:
    python3 scripts/ingest_analysis.py               # Run ingestion
    python3 scripts/ingest_analysis.py --dry-run      # Preview without inserting
    python3 scripts/ingest_analysis.py --limit 5      # Ingest at most 5

Environment variables (required):
    SUPABASE_URL          – e.g. https://xxx.supabase.co
    SUPABASE_SERVICE_KEY  – service-role key
    ANTHROPIC_API_KEY     – for Claude translation (optional but recommended)

Sources:
    CoinDesk, CoinTelegraph, The Block, Decrypt, Bitcoin Magazine
    (only articles that look like analysis/opinion, not short flash news)
"""

from __future__ import annotations

import os, sys, re, json, hashlib, time, argparse, html
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError
from xml.etree import ElementTree as ET
from typing import Optional

# ── Config ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

ANALYSIS_RSS_SOURCES = [
    {
        "name": "CoinDesk",
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "min_desc_len": 200,
    },
    {
        "name": "CoinTelegraph",
        "url": "https://cointelegraph.com/rss",
        "min_desc_len": 200,
    },
    {
        "name": "The Block",
        "url": "https://www.theblock.co/rss.xml",
        "min_desc_len": 150,
    },
    {
        "name": "Decrypt",
        "url": "https://decrypt.co/feed",
        "min_desc_len": 200,
    },
    {
        "name": "Bitcoin Magazine",
        "url": "https://bitcoinmagazine.com/.rss/full/",
        "min_desc_len": 200,
    },
]

# Keywords that indicate analysis/opinion content (vs. short flash news)
ANALYSIS_KEYWORDS = [
    "analysis", "opinion", "insight", "deep dive", "explained",
    "outlook", "forecast", "review", "report", "commentary",
    "why", "how", "what it means", "implications", "long-term",
    "strategy", "guide", "comprehensive", "in-depth",
]

# Category detection
CATEGORY_MAP = {
    "BTC": ["bitcoin", "btc", "halving", "satoshi", "mining"],
    "ETH": ["ethereum", "eth", "vitalik", "erc-20", "erc20"],
    "DeFi": ["defi", "dex", "lending", "yield", "tvl", "uniswap", "aave", "liquidity"],
    "NFT": ["nft", "opensea", "collection", "mint", "metaverse"],
    "L2": ["layer 2", "layer-2", "rollup", "arbitrum", "optimism", "base chain", "zk-rollup"],
    "Policy": ["sec", "regulation", "law", "compliance", "congress", "mica", "ban", "approve"],
    "SOL": ["solana", "sol"],
    "Stable": ["stablecoin", "usdt", "usdc", "tether", "circle"],
    "AI": ["ai", "artificial intelligence", "machine learning", "gpt", "llm"],
    "Exchange": ["binance", "coinbase", "kraken", "exchange"],
}

HEADERS = {"User-Agent": "HashSpring-Bot/1.0 (analysis ingester)"}


# ── Helpers ─────────────────────────────────────────────────
def fetch_rss(url: str) -> list[dict]:
    """Parse an RSS feed and return list of items."""
    items = []
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=15) as resp:
            data = resp.read()
        root = ET.fromstring(data)

        ns = {}
        # Handle common namespaces
        for prefix, uri in [
            ("dc", "http://purl.org/dc/elements/1.1/"),
            ("content", "http://purl.org/rss/1.0/modules/content/"),
            ("media", "http://search.yahoo.com/mrss/"),
        ]:
            ns[prefix] = uri

        for item_el in root.findall(".//item"):
            title = (item_el.findtext("title") or "").strip()
            link = (item_el.findtext("link") or "").strip()
            desc = (item_el.findtext("description") or "").strip()
            pub_date = (item_el.findtext("pubDate") or "").strip()
            author = (item_el.findtext(f"{{{ns['dc']}}}creator") or "").strip()
            content_encoded = (item_el.findtext(f"{{{ns['content']}}}encoded") or "").strip()
            category_el = item_el.findtext("category") or ""

            # Clean HTML from description
            desc_clean = re.sub(r"<[^>]+>", "", html.unescape(desc)).strip()
            content_clean = re.sub(r"<[^>]+>", "", html.unescape(content_encoded)).strip() if content_encoded else ""

            items.append({
                "title": title,
                "link": link,
                "description": desc_clean,
                "content_html": content_encoded or desc,
                "content_text": content_clean or desc_clean,
                "pub_date": pub_date,
                "author": author,
                "category_raw": category_el.strip(),
            })
    except Exception as e:
        print(f"  ⚠ Failed to fetch {url}: {e}")

    return items


def is_analysis_content(item: dict, min_desc_len: int) -> bool:
    """Determine if an RSS item is analysis/opinion rather than flash news."""
    text = f"{item['title']} {item['description']}".lower()
    content_len = len(item.get("content_text", "") or item["description"])

    # Long content is more likely analysis
    if content_len >= 800:
        return True

    # Check for analysis keywords in title/description
    if any(kw in text for kw in ANALYSIS_KEYWORDS):
        return True

    # Short flash-style news should be excluded
    if len(item["description"]) < min_desc_len:
        return False

    # Medium-length content — include if description is substantial
    return len(item["description"]) >= 300


def detect_category(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    for cat, keywords in CATEGORY_MAP.items():
        if any(kw in text for kw in keywords):
            return cat.lower()
    return "analysis"


def make_slug(title: str, source: str) -> str:
    """Generate a URL-friendly slug from title."""
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"\s+", "-", slug).strip("-")[:80]
    # Add short hash to prevent collisions
    h = hashlib.md5(f"{source}:{title}".encode()).hexdigest()[:6]
    return f"{slug}-{h}" if slug else h


def parse_pub_date(date_str: str) -> str | None:
    """Parse various RSS date formats to ISO 8601."""
    if not date_str:
        return None
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
    ]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.astimezone(timezone.utc).isoformat()
        except ValueError:
            continue
    return None


def translate_to_zh(title: str, excerpt: str) -> tuple[str, str]:
    """Translate title and excerpt to Chinese via Claude API."""
    if not ANTHROPIC_KEY:
        return "", ""
    try:
        prompt = f"""Translate the following crypto article title and excerpt to Simplified Chinese.
Return JSON: {{"title_zh": "...", "excerpt_zh": "..."}}

Title: {title}
Excerpt: {excerpt[:500]}"""

        body = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 500,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()

        req = Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
            },
        )
        with urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())

        text = result["content"][0]["text"]
        # Extract JSON from response
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            return parsed.get("title_zh", ""), parsed.get("excerpt_zh", "")
    except Exception as e:
        print(f"  ⚠ Translation failed: {e}")
    return "", ""


def check_existing_slugs(slugs: list[str]) -> set[str]:
    """Check which slugs already exist in Supabase."""
    if not slugs or not SUPABASE_URL:
        return set()
    try:
        # Query existing slugs
        slug_filter = ",".join(f'"{s}"' for s in slugs)
        qs = f"select=slug&slug=in.({slug_filter})"
        req = Request(
            f"{SUPABASE_URL}/rest/v1/articles?{qs}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        with urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read())
        return {r["slug"] for r in rows}
    except Exception as e:
        print(f"  ⚠ Slug check failed: {e}")
        return set()


def check_existing_urls(urls: list[str]) -> set[str]:
    """Check which source_urls already exist in Supabase."""
    if not urls or not SUPABASE_URL:
        return set()
    try:
        url_filter = ",".join(f'"{u}"' for u in urls[:50])
        qs = f"select=source_url&source_url=in.({url_filter})"
        req = Request(
            f"{SUPABASE_URL}/rest/v1/articles?{qs}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        with urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read())
        return {r["source_url"] for r in rows}
    except Exception as e:
        print(f"  ⚠ URL check failed: {e}")
        return set()


def insert_article(article: dict) -> bool:
    """Insert a single article into Supabase."""
    try:
        body = json.dumps(article).encode()
        req = Request(
            f"{SUPABASE_URL}/rest/v1/articles",
            data=body,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            method="POST",
        )
        with urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"  ✗ Insert failed: {e}")
        return False


# ── Main ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Ingest analysis articles from RSS")
    parser.add_argument("--dry-run", action="store_true", help="Preview without inserting")
    parser.add_argument("--limit", type=int, default=20, help="Max articles to ingest (default: 20)")
    parser.add_argument("--no-translate", action="store_true", help="Skip translation step")
    args = parser.parse_args()

    if not args.dry_run and (not SUPABASE_URL or not SUPABASE_KEY):
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables")
        sys.exit(1)

    print("=" * 60)
    print("HashSpring Analysis Article Ingester")
    print("=" * 60)

    # Step 1: Fetch RSS from all sources
    all_candidates = []
    for src in ANALYSIS_RSS_SOURCES:
        print(f"\n📡 Fetching {src['name']}...")
        items = fetch_rss(src["url"])
        print(f"   Found {len(items)} total items")

        analysis_items = [
            {**item, "source_name": src["name"]}
            for item in items
            if is_analysis_content(item, src["min_desc_len"])
        ]
        print(f"   → {len(analysis_items)} classified as analysis")
        all_candidates.extend(analysis_items)

    if not all_candidates:
        print("\n⚠ No analysis articles found. Exiting.")
        return

    # Step 2: Deduplicate against existing articles
    candidate_urls = [a["link"] for a in all_candidates if a.get("link")]
    existing_urls = check_existing_urls(candidate_urls) if not args.dry_run else set()
    new_articles = [a for a in all_candidates if a["link"] not in existing_urls]

    print(f"\n📊 {len(all_candidates)} candidates, {len(existing_urls)} already exist, {len(new_articles)} new")

    # Sort by date (newest first) and limit
    new_articles.sort(key=lambda a: a.get("pub_date", ""), reverse=True)
    new_articles = new_articles[: args.limit]

    if not new_articles:
        print("✓ No new articles to ingest.")
        return

    # Step 3: Process and insert
    inserted = 0
    for i, article in enumerate(new_articles, 1):
        title = article["title"]
        source = article["source_name"]
        slug = make_slug(title, source)
        pub_date = parse_pub_date(article["pub_date"])
        category = detect_category(title, article["description"])
        excerpt = article["description"][:500]
        content_text = article.get("content_text", "") or article["description"]
        content_html_raw = article.get("content_html", "") or article["description"]
        char_count = len(content_text)
        read_time = max(1, char_count // 1000)

        print(f"\n[{i}/{len(new_articles)}] {title[:60]}...")
        print(f"   Source: {source} | Category: {category} | {char_count} chars")

        # Translate
        title_zh, excerpt_zh = "", ""
        if not args.no_translate and ANTHROPIC_KEY:
            print("   🌐 Translating to Chinese...")
            title_zh, excerpt_zh = translate_to_zh(title, excerpt)
            if title_zh:
                print(f"   → {title_zh[:40]}...")
            time.sleep(0.5)  # Rate limit

        row = {
            "slug": slug,
            "title": title_zh or title,
            "title_en": title,
            "excerpt": excerpt_zh or excerpt,
            "excerpt_en": excerpt,
            "content": content_text[:10000],
            "content_html": content_html_raw[:20000],
            "cover_image": "",
            "category": "analysis",
            "author": article.get("author") or source,
            "tags": [category] if category != "analysis" else [],
            "locale": "zh" if title_zh else "en",
            "source": source.lower().replace(" ", ""),
            "source_url": article["link"],
            "published_at": pub_date or datetime.now(timezone.utc).isoformat(),
            "char_count": char_count,
            "read_time": read_time,
            "is_published": True,
            "is_featured": False,
        }

        if args.dry_run:
            print(f"   [DRY RUN] Would insert: {slug}")
        else:
            if insert_article(row):
                inserted += 1
                print(f"   ✓ Inserted: {slug}")
            else:
                print(f"   ✗ Failed to insert: {slug}")

    # Summary
    print("\n" + "=" * 60)
    if args.dry_run:
        print(f"DRY RUN complete: {len(new_articles)} articles would be ingested")
    else:
        print(f"Done: {inserted}/{len(new_articles)} articles ingested successfully")
    print("=" * 60)


if __name__ == "__main__":
    main()
