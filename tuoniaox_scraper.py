#!/usr/bin/env python3
import requests, json, os, time, re, sys
from datetime import datetime
from bs4 import BeautifulSoup

OUTPUT_DIR = os.path.expanduser("~/hashspring-next/tuoniaox_data")
URL_LIST_FILE = os.path.join(OUTPUT_DIR, "url_list.json")
ARTICLES_DIR = os.path.join(OUTPUT_DIR, "articles")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "progress.json")
REQUEST_DELAY = 1.5
MAX_RETRIES = 3
TIMEOUT = 30
ANALYSIS_MIN_CHARS = 1500
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def fetch_url_list():
    print("=" * 60)
    print("Step 1/2: Fetching article index from Wayback Machine...")
    print("=" * 60)
    all_articles = {}
    domains = ["www.tuoniaox.com/news/p-*", "m.tuoniaox.com/news/p-*", "tuoniaox.com/news/p-*"]
    for dp in domains:
        print(f"  Querying: {dp}")
        url = f"https://web.archive.org/cdx/search/cdx?url={dp}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=10000&collapse=urlkey"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            for row in data[1:]:
                ts, orig, st = row
                m = re.search(r'p-(\d+)', orig)
                if m:
                    aid = int(m.group(1))
                    if aid not in all_articles:
                        all_articles[aid] = {"id": aid, "timestamp": ts, "original_url": orig, "wayback_url": f"https://web.archive.org/web/{ts}/{orig}"}
            print(f"    Found {len(data)-1} records, total unique: {len(all_articles)}")
            time.sleep(1)
        except Exception as e:
            print(f"    Failed: {e}")
    sorted_articles = sorted(all_articles.values(), key=lambda x: x["id"])
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(URL_LIST_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_articles, f, ensure_ascii=False, indent=2)
    print(f"  Total: {len(sorted_articles)} articles")
    print(f"  Saved: {URL_LIST_FILE}")
    return sorted_articles

def parse_article(html, url):
    soup = BeautifulSoup(html, "html.parser")
    title = ""
    h1 = soup.find("h1")
    if h1: title = h1.get_text(strip=True)
    pub_date = ""
    for sel in [".time", ".article-time", "time", ".publish-time", ".news-time", ".date"]:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(strip=True)
            dm = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2}[\s]*\d{0,2}:?\d{0,2}:?\d{0,2})', text)
            if dm:
                pub_date = dm.group(1).strip()
                break
    author = ""
    info_spans = soup.select(".articlebox .info span, .news-info span, .article-info span")
    if info_spans: author = info_spans[0].get_text(strip=True)
    content_html = ""
    content_text = ""
    for sel in [".news_detail", ".article-content", ".news-content", ".detail-content", ".post-content", "article", ".content"]:
        el = soup.select_one(sel)
        if el:
            for wb in el.select('[id^="wm-"], .wb-autocomplete-suggestions'): wb.decompose()
            content_html = str(el)
            content_text = el.get_text(separator="\n", strip=True)
            if len(content_text) > 50: break
    tags = []
    for sel in [".tags a", ".tag-list a", ".article-tags a", ".keyword a"]:
        tag_els = soup.select(sel)
        if tag_els:
            tags = [t.get_text(strip=True) for t in tag_els if t.get_text(strip=True)]
            break
    cover_img = ""
    og = soup.find("meta", property="og:image")
    if og: cover_img = og.get("content", "")
    return {"title": title, "pub_date": pub_date, "author": author, "content_text": content_text, "content_html": content_html, "tags": tags, "cover_img": cover_img, "is_analysis": len(content_text) >= ANALYSIS_MIN_CHARS, "char_count": len(content_text)}

def scrape_article(info, retries=0):
    try:
        resp = requests.get(info["wayback_url"], headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        parsed = parse_article(resp.text, info["wayback_url"])
        parsed["id"] = info["id"]
        parsed["original_url"] = info["original_url"]
        parsed["wayback_url"] = info["wayback_url"]
        parsed["archive_timestamp"] = info["timestamp"]
        return parsed
    except Exception as e:
        if retries < MAX_RETRIES:
            time.sleep((retries+1)*3)
            return scrape_article(info, retries+1)
        return {"id": info["id"], "error": str(e), "original_url": info["original_url"]}

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f: return json.load(f)
    return {"completed_ids": [], "failed_ids": []}

def save_progress(p):
    with open(PROGRESS_FILE, "w") as f: json.dump(p, f)

def scrape_all():
    if not os.path.exists(URL_LIST_FILE):
        articles = fetch_url_list()
    else:
        with open(URL_LIST_FILE, encoding="utf-8") as f: articles = json.load(f)
        print(f"Loaded URL list: {len(articles)} articles")
    os.makedirs(ARTICLES_DIR, exist_ok=True)
    progress = load_progress()
    done = set(progress["completed_ids"])
    fails = progress["failed_ids"]
    remaining = [a for a in articles if a["id"] not in done]
    print(f"Total: {len(articles)} | Done: {len(done)} | Remaining: {len(remaining)}")
    print(f"Est. time: ~{len(remaining)*REQUEST_DELAY/60:.0f} min")
    sc, fc, ac = 0, 0, 0
    for i, art in enumerate(remaining):
        aid = art["id"]
        print(f"[{i+1}/{len(remaining)}] p-{aid}...", end=" ", flush=True)
        result = scrape_article(art)
        if "error" in result:
            print(f"FAIL: {result['error'][:60]}")
            fc += 1; fails.append(aid)
        else:
            label = "ANALYSIS" if result["is_analysis"] else "NEWS"
            print(f"OK {label} | {result['title'][:40]} | {result['char_count']}chars")
            if result["is_analysis"]: ac += 1
            with open(os.path.join(ARTICLES_DIR, f"p-{aid}.json"), "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            sc += 1
        done.add(aid)
        progress["completed_ids"] = list(done)
        progress["failed_ids"] = fails
        if (i+1) % 50 == 0:
            save_progress(progress)
            print(f"  --- Progress saved (ok:{sc} fail:{fc} analysis:{ac}) ---")
        time.sleep(REQUEST_DELAY)
    save_progress(progress)
    print(f"Done! Success: {sc} | Failed: {fc} | Analysis: {ac}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--urls-only":
        fetch_url_list()
    else:
        scrape_all()