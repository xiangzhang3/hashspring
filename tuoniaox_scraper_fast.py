#!/usr/bin/env python3
"""
鸵鸟区块链 (tuoniaox.com) 文章批量抓取脚本 — 并发加速版
从 Wayback Machine 恢复已存档的文章内容

相比原版 tuoniaox_scraper.py 的改进:
  - 多线程并发抓取 (默认 8 线程)
  - requests.Session 连接复用
  - 更低的单线程延迟
  - 批量进度保存
  - 速度提升 5-10x

使用方法:
  pip3 install requests beautifulsoup4 --break-system-packages
  python3 tuoniaox_scraper_fast.py               # 默认 8 线程
  python3 tuoniaox_scraper_fast.py --workers 12   # 自定义线程数
  python3 tuoniaox_scraper_fast.py --urls-only    # 仅获取 URL 列表
"""

import requests
import json
import os
import time
import re
import sys
import threading
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

# ============ 配置 ============
OUTPUT_DIR = os.path.expanduser("~/hashspring-next/tuoniaox_data")
URL_LIST_FILE = os.path.join(OUTPUT_DIR, "url_list.json")
ARTICLES_DIR = os.path.join(OUTPUT_DIR, "articles")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "progress.json")
SUMMARY_FILE = os.path.join(OUTPUT_DIR, "summary.json")

# 并发控制
MAX_WORKERS = 8          # 并发线程数（Wayback Machine 建议不超过 15）
REQUEST_DELAY = 0.3      # 每个线程内的请求间隔（秒）
GLOBAL_RATE_LIMIT = 12   # 全局每秒最大请求数
MAX_RETRIES = 3
TIMEOUT = 30
ANALYSIS_MIN_CHARS = 1500

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# 全局速率限制器
_rate_lock = threading.Lock()
_last_request_times = []


def rate_limited_request(session, url, timeout=TIMEOUT):
    """带全局速率限制的请求"""
    with _rate_lock:
        now = time.time()
        # 清理1秒前的记录
        _last_request_times[:] = [t for t in _last_request_times if now - t < 1.0]
        if len(_last_request_times) >= GLOBAL_RATE_LIMIT:
            wait = 1.0 - (now - _last_request_times[0])
            if wait > 0:
                time.sleep(wait)
        _last_request_times.append(time.time())

    return session.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)


# ============ 创建带连接池的 Session ============
def create_session():
    """创建带连接池复用的 requests Session"""
    s = requests.Session()
    s.headers.update(HEADERS)
    # 连接池大小匹配 worker 数
    adapter = requests.adapters.HTTPAdapter(
        pool_connections=MAX_WORKERS,
        pool_maxsize=MAX_WORKERS,
        max_retries=0  # 我们自己处理重试
    )
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


# ============ 步骤1: 获取 URL 列表 (不变) ============
def fetch_url_list():
    """从 Wayback Machine CDX API 获取所有存档的文章 URL"""
    print("=" * 60)
    print("步骤 1/2: 从 Wayback Machine 获取文章索引...")
    print("=" * 60)

    all_articles = {}
    domains = [
        "www.tuoniaox.com/news/p-*",
        "m.tuoniaox.com/news/p-*",
        "tuoniaox.com/news/p-*",
    ]

    for domain_pattern in domains:
        print(f"\n正在查询: {domain_pattern}")
        url = (
            f"https://web.archive.org/cdx/search/cdx"
            f"?url={domain_pattern}"
            f"&output=json"
            f"&fl=timestamp,original,statuscode"
            f"&filter=statuscode:200"
            f"&limit=10000"
            f"&collapse=urlkey"
        )

        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()
            data = resp.json()

            for row in data[1:]:
                timestamp, original_url, status = row
                match = re.search(r'p-(\d+)', original_url)
                if match:
                    article_id = int(match.group(1))
                    if article_id not in all_articles:
                        all_articles[article_id] = {
                            "id": article_id,
                            "timestamp": timestamp,
                            "original_url": original_url,
                            "wayback_url": f"https://web.archive.org/web/{timestamp}/{original_url}"
                        }

            print(f"  找到 {len(data) - 1} 条记录，累计去重: {len(all_articles)}")
            time.sleep(1)

        except Exception as e:
            print(f"  查询失败: {e}")

    sorted_articles = sorted(all_articles.values(), key=lambda x: x["id"])
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(URL_LIST_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_articles, f, ensure_ascii=False, indent=2)

    print(f"\n共找到 {len(sorted_articles)} 篇文章")
    if sorted_articles:
        print(f"ID 范围: p-{sorted_articles[0]['id']} ~ p-{sorted_articles[-1]['id']}")
    print(f"URL 列表已保存: {URL_LIST_FILE}")
    return sorted_articles


# ============ 步骤2: 解析 + 抓取 ============
def parse_article(html, url):
    """解析文章页面，提取标题、日期、作者、正文"""
    soup = BeautifulSoup(html, "html.parser")

    title = ""
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)

    pub_date = ""
    for selector in [".time", ".article-time", "time", ".publish-time", ".news-time", ".date"]:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(strip=True)
            date_match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2}[\s]*\d{0,2}:?\d{0,2}:?\d{0,2})', text)
            if date_match:
                pub_date = date_match.group(1).strip()
                break

    author = ""
    info_spans = soup.select(".articlebox .info span, .news-info span, .article-info span")
    if info_spans:
        author = info_spans[0].get_text(strip=True)

    content_html = ""
    content_text = ""
    for selector in [".news_detail", ".article-content", ".news-content", ".detail-content", ".post-content", "article", ".content"]:
        el = soup.select_one(selector)
        if el:
            for wb_el in el.select('[id^="wm-"], .wb-autocomplete-suggestions'):
                wb_el.decompose()
            content_html = str(el)
            content_text = el.get_text(separator="\n", strip=True)
            if len(content_text) > 50:
                break

    tags = []
    for selector in [".tags a", ".tag-list a", ".article-tags a", ".keyword a"]:
        tag_els = soup.select(selector)
        if tag_els:
            tags = [t.get_text(strip=True) for t in tag_els if t.get_text(strip=True)]
            break

    cover_img = ""
    og_img = soup.find("meta", property="og:image")
    if og_img:
        cover_img = og_img.get("content", "")

    is_analysis = len(content_text) >= ANALYSIS_MIN_CHARS

    return {
        "title": title,
        "pub_date": pub_date,
        "author": author,
        "content_text": content_text,
        "content_html": content_html,
        "tags": tags,
        "cover_img": cover_img,
        "is_analysis": is_analysis,
        "char_count": len(content_text),
    }


def scrape_one(session, article_info, retries=0):
    """抓取单篇文章（线程安全）"""
    try:
        resp = rate_limited_request(session, article_info["wayback_url"])
        resp.raise_for_status()

        parsed = parse_article(resp.text, article_info["wayback_url"])
        parsed["id"] = article_info["id"]
        parsed["original_url"] = article_info["original_url"]
        parsed["wayback_url"] = article_info["wayback_url"]
        parsed["archive_timestamp"] = article_info["timestamp"]
        return parsed

    except Exception as e:
        if retries < MAX_RETRIES:
            wait = (retries + 1) * 2
            time.sleep(wait)
            return scrape_one(session, article_info, retries + 1)
        else:
            return {
                "id": article_info["id"],
                "error": str(e),
                "original_url": article_info["original_url"],
            }


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"completed_ids": [], "failed_ids": []}


def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)


def scrape_all(max_workers=MAX_WORKERS):
    """并发批量抓取所有文章"""
    # 加载 URL 列表
    if not os.path.exists(URL_LIST_FILE):
        articles = fetch_url_list()
    else:
        with open(URL_LIST_FILE, "r", encoding="utf-8") as f:
            articles = json.load(f)
        print(f"已加载 URL 列表: {len(articles)} 篇文章")

    os.makedirs(ARTICLES_DIR, exist_ok=True)

    # 加载进度（兼容原版 progress.json）
    progress = load_progress()
    completed_set = set(progress["completed_ids"])
    failed_ids = list(progress.get("failed_ids", []))

    remaining = [a for a in articles if a["id"] not in completed_set]

    # 预计时间 (并发版)
    est_minutes = len(remaining) / (max_workers * (1.0 / max(REQUEST_DELAY, 0.1))) / 60

    print(f"\n{'=' * 60}")
    print(f"步骤 2/2: 并发批量抓取文章内容")
    print(f"{'=' * 60}")
    print(f"总计: {len(articles)} | 已完成: {len(completed_set)} | 剩余: {len(remaining)}")
    print(f"并发线程: {max_workers} | 速率限制: {GLOBAL_RATE_LIMIT} req/s")
    print(f"预计用时: ~{est_minutes:.0f} 分钟 (原版: ~{len(remaining) * 1.5 / 60:.0f} 分钟)")
    print(f"{'=' * 60}\n")

    if not remaining:
        print("所有文章已抓取完毕！")
        return

    session = create_session()
    success_count = 0
    fail_count = 0
    analysis_count = 0
    done_count = 0
    _progress_lock = threading.Lock()
    start_time = time.time()

    def process_result(result, article_id):
        nonlocal success_count, fail_count, analysis_count, done_count
        with _progress_lock:
            done_count += 1
            if "error" in result:
                print(f"  [{done_count}/{len(remaining)}] ❌ p-{article_id}: {result['error'][:50]}")
                fail_count += 1
                failed_ids.append(article_id)
            else:
                char_count = result["char_count"]
                is_analysis = result["is_analysis"]
                label = "📊" if is_analysis else "📰"
                print(f"  [{done_count}/{len(remaining)}] {label} p-{article_id}: {result['title'][:40]} | {char_count}字")
                if is_analysis:
                    analysis_count += 1

                article_file = os.path.join(ARTICLES_DIR, f"p-{article_id}.json")
                with open(article_file, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                success_count += 1

            completed_set.add(article_id)

            # 每 100 篇保存一次进度
            if done_count % 100 == 0:
                elapsed = time.time() - start_time
                rate = done_count / elapsed if elapsed > 0 else 0
                eta = (len(remaining) - done_count) / rate / 60 if rate > 0 else 0
                progress["completed_ids"] = list(completed_set)
                progress["failed_ids"] = failed_ids
                save_progress(progress)
                print(f"\n  --- 进度: {done_count}/{len(remaining)} | "
                      f"成功: {success_count} | 失败: {fail_count} | "
                      f"速度: {rate:.1f} 篇/秒 | 预计剩余: {eta:.1f} 分钟 ---\n")

    # 并发执行
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for article in remaining:
            future = executor.submit(scrape_one, session, article)
            futures[future] = article["id"]

        for future in as_completed(futures):
            article_id = futures[future]
            try:
                result = future.result()
                process_result(result, article_id)
            except Exception as e:
                process_result({"id": article_id, "error": str(e), "original_url": ""}, article_id)

    # 最终保存
    progress["completed_ids"] = list(completed_set)
    progress["failed_ids"] = failed_ids
    save_progress(progress)

    elapsed = time.time() - start_time
    summary = {
        "total_found": len(articles),
        "success": success_count + (len(completed_set) - len(remaining)),
        "failed": fail_count,
        "analysis_articles": analysis_count,
        "elapsed_seconds": round(elapsed, 1),
        "scraped_at": datetime.now().isoformat(),
    }
    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"抓取完成!")
    print(f"成功: {success_count} | 失败: {fail_count} | 分析类: {analysis_count}")
    print(f"总耗时: {elapsed/60:.1f} 分钟 | 平均速度: {(success_count+fail_count)/elapsed:.1f} 篇/秒")
    print(f"文章保存目录: {ARTICLES_DIR}")
    print(f"{'=' * 60}")


# ============ 入口 ============
if __name__ == "__main__":
    workers = MAX_WORKERS

    if "--urls-only" in sys.argv:
        fetch_url_list()
    else:
        # 支持 --workers N 参数
        for i, arg in enumerate(sys.argv):
            if arg == "--workers" and i + 1 < len(sys.argv):
                workers = int(sys.argv[i + 1])
                workers = max(1, min(workers, 20))  # 限制 1-20

        scrape_all(max_workers=workers)
