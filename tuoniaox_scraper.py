#!/usr/bin/env python3
"""
鸵鸟区块链 (tuoniaox.com) 文章批量抓取脚本
从 Wayback Machine 恢复已存档的文章内容

使用方法:
  pip3 install requests beautifulsoup4 --break-system-packages
  python3 tuoniaox_scraper.py

功能:
  1. 从 Wayback Machine CDX API 获取所有存档 URL
  2. 批量抓取文章标题、日期、作者、正文、标签
  3. 保存为 JSON 文件，支持断点续传
  4. 长文分析类文章单独标记，便于后续分类到"分析"板块
"""

import requests
import json
import os
import time
import re
import sys
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# ============ 配置 ============
OUTPUT_DIR = os.path.expanduser("~/hashspring-next/tuoniaox_data")
URL_LIST_FILE = os.path.join(OUTPUT_DIR, "url_list.json")
ARTICLES_DIR = os.path.join(OUTPUT_DIR, "articles")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "progress.json")
SUMMARY_FILE = os.path.join(OUTPUT_DIR, "summary.json")

# 请求间隔（秒），避免被 Wayback Machine 限流
REQUEST_DELAY = 1.5
# 最大重试次数
MAX_RETRIES = 3
# 超时时间（秒）
TIMEOUT = 30
# 最小字数判定为"长文分析"
ANALYSIS_MIN_CHARS = 1500

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ============ 步骤1: 获取 URL 列表 ============
def fetch_url_list():
    """从 Wayback Machine CDX API 获取所有存档的文章 URL"""
    print("=" * 60)
    print("步骤 1/2: 从 Wayback Machine 获取文章索引...")
    print("=" * 60)

    all_articles = {}

    # 搜索 www 和 m 两个子域
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

            # 第一行是表头
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

            print(f"  找到 {len(data) - 1} 条记录，累计去野: {len(all_articles)}")
            time.sleep(1)

        except Exception as e:
            print(f"  查询失败: {e}")

    # 按 ID 排序
    sorted_articles = sorted(all_articles.values(), key=lambda x: x["id"])

    # 保存
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(URL_LIST_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_articles, f, ensure_ascii=False, indent=2)

    print(f"\n共找到 {len(sorted_articles)} 篇文章")
    print(f"ID 范围: p-{sorted_articles[0]['id']} ~ p-{sorted_articles[-1]['id']}")
    print(f"URL 列表已保存: {URL_LIST_FILE}")

    return sorted_articles


# ============ 步骤2: 抓取文章内容 ============
def parse_article(html, url):
    """解析文章页面，提取标题、日期、作者、正文"""
    soup = BeautifulSoup(html, "html.parser")

    # 标题
    title = ""
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)

    # 日期 - 多种选择器
    pub_date = ""
    for selector in [".time", ".article-time", "time", ".publish-time", ".news-time", ".date"]:
        el = soup.select_one(selector)
        if el:
            text = el.get_text(strip=True)
            # 匹配日期格式
            date_match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2}[\s]*\d{0,2}:?\d{0,2}:?\d{0,2})', text)
            if date_match:
                pub_date = date_match.group(1).strip()
                break

    # 作者 - 通常在 info 区域的第一个 span
    author = ""
    info_spans = soup.select(".articlebox .info span, .news-info span, .article-info span")
    if info_spans:
        author = info_spans[0].get_text(strip=True)

    # 正文 - www 版本用 .news_detail, m 版本可能不同
    content_html = ""
    content_text = ""
    for selector in [".news_detail", ".article-content", ".news-content", ".detail-content", ".post-content", "article", ".content"]:
        el = soup.select_one(selector)
        if el:
            # 移除 Wayback Machine 注入的元素
            for wb_el in el.select('[id^="wm-"], .wb-autocomplete-suggestions'):
                wb_el.decompose()
            content_html = str(el)
            content_text = el.get_text(separator="\n", strip=True)
            if len(content_text) > 50:
                break

    # 标签
    tags = []
    for selector in [".tags a", ".tag-list a", ".article-tags a", ".keyword a"]:
        tag_els = soup.select(selector)
        if tag_els:
            tags = [t.get_text(strip=True) for t in tag_els if t.get_text(strip=True)]
            break

    # 封面图
    cover_img = ""
    og_img = soup.find("meta", property="og:image")
    if og_img:
        cover_img = og_img.get("content", "")

    # 判断是否为长文分析类
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


def scrape_article(article_info, retries=0):
    """抓取单篇文章"""
    try:
        resp = requests.get(
            article_info["wayback_url"],
            headers=HEADERS,
            timeout=TIMEOUT,
            allow_redirects=True
        )
        resp.raise_for_status()

        parsed = parse_article(resp.text, article_info["wayback_url"])
        parsed["id"] = article_info["id"]
        parsed["original_url"] = article_info["original_url"]
        parsed["wayback_url"] = article_info["wayback_url"]
        parsed["archive_timestamp"] = article_info["timestamp"]

        return parsed

    except Exception as e:
        if retries < MAX_RETRIES:
            wait = (retries + 1) * 3
            print(f"    重试 ({retries+1}/{MAX_RETRIES})，等待 {wait}s... 错误: {e}")
            time.sleep(wait)
            return scrape_article(article_info, retries + 1)
        else:
            return {
                "id": article_info["id"],
                "error": str(e),
                "original_url": article_info["original_url"],
            }


def load_progress():
    """加载断点续传进度"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"completed_ids": [], "failed_ids": []}


def save_progress(progress):
    """保存进度"""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f)


def scrape_all():
    """批量抓取所有文章"""
    # 加载 URL 列表
    if not os.path.exists(URL_LIST_FILE):
        articles = fetch_url_list()
    else:
        with open(URL_LIST_FILE, "r", encoding="utf-8") as f:
            articles = json.load(f)
        print(f"已加载 URL 列表: {len(articles)} 篇文章")

    os.makedirs(ARTICLES_DIR, exist_ok=True)

    # 加载进度
    progress = load_progress()
    completed_set = set(progress["completed_ids"])
    failed_ids = progress["failed_ids"]

    # 过滤已完成的
    remaining = [a for a in articles if a["id"] not in completed_set]

    print(f"\n{'=' * 60}")
    print(f"步骤 2/2: 批量抓取文章内容")
    print(f"{'=' * 60}")
    print(f"总计: {len(articles)} | 已完成: {len(completed_set)} | 剩余: {len(remaining)}")
    print(f"预计用时: ~{len(remaining) * REQUEST_DELAY / 60:.0f} 分钟")
    print(f"{'=' * 60}\n")

    success_count = 0
    fail_count = 0
    analysis_count = 0

    for i, article in enumerate(remaining):
        article_id = article["id"]
        print(f"[{i+1}/{len(remaining)}] 抓取 p-{article_id}...", end=" ", flush=True)

        result = scrape_article(article)

        if "error" in result:
            print(f"❌ 失败: {result['error'][:60]}")
            fail_count += 1
            failed_ids.append(article_id)
        else:
            char_count = result["char_count"]
            is_analysis = result["is_analysis"]
            label = "📊 分析" if is_analysis else "📰 新闻"
            print(f"✅ {label} | {result['title'][:40]} | {char_count}字")

            if is_analysis:
                analysis_count += 1

            # 保存单篇文章
            article_file = os.path.join(ARTICLES_DIR, f"p-{article_id}.json")
            with open(article_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            success_count += 1

        # 更新进度
        completed_set.add(article_id)
        progress["completed_ids"] = list(completed_set)
        progress["failed_ids"] = failed_ids

        # 每 50 篇保存一次进度
        if (i + 1) % 50 == 0:
            save_progress(progress)
            print(f"\n  --- 进度已保存 (成功: {success_count}, 失败: {fail_count}, 分析类: {analysis_count}) ---\n")

        time.sleep(REQUEST_DELAY)

    # 最终保存进度
    save_progress(progress)

    # 生成摘要
    summary = {
        "total_found": len(articles),
        "success": success_count + len(completed_set) - len(remaining),
        "failed": fail_count,
        "analysis_articles": analysis_count,
        "scraped_at": datetime.now().isoformat(),
    }
    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"抓取完成!")
    print(f"成功: {success_count} | 失败: {fail_count} | 分析类: {analysis_count}")
    print(f"文章保存目录: {ARTICLES_DIR}")
    print(f"{'=' * 60}")


# ============ 入口 ============
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--urls-only":
        fetch_url_list()
    else:
        scrape_all()
