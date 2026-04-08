#!/usr/bin/env python3
"""
将抓取的鸵鸟区块链文章导入 hashspring.com (Supabase)

使用方法:
  1. 先运行 tuoniaox_scraper.py 抓取文章
  2. 设置环境变量:
     export SUPABASE_URL="https://skfpuzlnhkoyifewvisz.supabase.co"
     export SUPABASE_KEY="你的 service_role key"
  3. python3 tuoniaox_importer.py

功能:
  - 读取抓取的 JSON 文章
  - 长文分析类 → analysis 分类 (收录到 /zh/analysis 与 /en/analysis)
  - 短文新闻类 → news 分类
  - 保留原始发布时间，按时间顺序导入
  - 每篇文章添加迁移声明
  - 直接写入 Supabase articles 表
"""

import json
import os
import re
import sys
import glob
import time
import requests
from datetime import datetime

# ============ 配置 ============
ARTICLES_DIR = os.path.expanduser("~/hashspring-next/tuoniaox_data/articles")

# 自动从 .env.local 读取配置（如果环境变量未设置）
def load_env_local():
    env_file = os.path.expanduser("~/hashspring-next/.env.local")
    env_vars = {}
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    env_vars[key.strip()] = val.strip()
    return env_vars

_env = load_env_local()
SUPABASE_URL = os.environ.get("SUPABASE_URL", _env.get("SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_SERVICE_KEY", _env.get("SUPABASE_SERVICE_KEY", _env.get("SUPABASE_ANON_KEY", ""))))
ANALYSIS_MIN_CHARS = 1500
BATCH_SIZE = 50  # 每批导入数量
REQUEST_DELAY = 0.3  # 请求间隔


def generate_slug(title, article_id):
    """生成 URL slug"""
    slug = re.sub(r'[^\w\u4e00-\u9fff-]', '-', title.lower())
    slug = re.sub(r'-+', '-', slug).strip('-')
    if not slug or len(slug) < 3:
        slug = f"article"
    # 限制长度，加上唯一 ID
    slug = slug[:80]
    return f"{slug}-{article_id}"


def parse_date(date_str):
    """解析日期字符串为 ISO 格式"""
    if not date_str:
        return None
    formats = [
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y/%m/%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%S+08:00")
        except ValueError:
            continue
    return None


def format_date_zh(date_str):
    """格式化日期为中文格式: 2019年12月24日"""
    if not date_str:
        return "未知日期"
    try:
        dt = datetime.fromisoformat(date_str.replace("+08:00", ""))
        return f"{dt.year}年{dt.month}月{dt.day}日"
    except:
        return date_str


def add_migration_notes(content_html, content_text, pub_date):
    """在文章内容添加迁移声明"""
    date_zh = format_date_zh(pub_date)

    # HTML 版本
    header_html = (
        f'<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:14px;color:#92400e;">'
        f'该文章更新于{date_zh}的 tuoniaox.com'
        f'</div>'
    )
    footer_html = (
        f'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:32px;font-size:14px;color:#64748b;">'
        f'tuoniaox.com 经主编授权，内容全部搬迁到 hashspring.com，后续将在 hashspring.com 持续输出。'
        f'</div>'
    )

    new_html = header_html + (content_html or '') + footer_html

    # 纯文本版本
    header_text = f"[该文章更新于{date_zh}的 tuoniaox.com]\n\n"
    footer_text = f"\n\n---\ntuoniaox.com 经主编授权，内容全部搬迁到 hashspring.com，后续将在 hashspring.com 持续输出。"

    new_text = header_text + (content_text or '') + footer_text

    return new_html, new_text


def estimate_read_time(char_count):
    """估算阅读时间（分钟），中文约 400 字/分钟"""
    return max(1, round(char_count / 400))


def generate_excerpt(text, max_len=200):
    """从正文生成摘要"""
    if not text:
        return ""
    # 跳过迁移声明
    text = re.sub(r'\[该文章更新于.*?\]\n*', '', text)
    # 取前 max_len 字符
    clean = text.strip()
    if len(clean) <= max_len:
        return clean
    # 在句号或逗号处断句
    truncated = clean[:max_len]
    for sep in ['。', '，', '；', '、', '.', ',', ' ']:
        pos = truncated.rfind(sep)
        if pos > max_len // 2:
            return truncated[:pos + 1]
    return truncated + '...'


def upload_to_supabase(records):
    """批量上传到 Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("错误: 请设置 SUPABASE_URL 和 SUPABASE_KEY 环境变量")
        print("  export SUPABASE_URL='https://skfpuzlnhkoyifewvisz.supabase.co'")
        print("  export SUPABASE_KEY='your-service-role-key'")
        sys.exit(1)

    url = f"{SUPABASE_URL}/rest/v1/articles?on_conflict=slug"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # upsert by slug
    }

    total = len(records)
    success = 0
    failed = 0

    import urllib.request
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            body = json.dumps(batch, ensure_ascii=True).encode('utf-8')
            req = urllib.request.Request(url, data=body, headers=headers, method='POST')
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                status = resp.status
            if status in (200, 201):
                success += len(batch)
                print(f"  批次 {i//BATCH_SIZE + 1}: ✅ 上传 {len(batch)} 篇 (累计 {success}/{total})")
            else:
                failed += len(batch)
                print(f"  批次 {i//BATCH_SIZE + 1}: ❌ 失败 status={status}")
        except urllib.error.HTTPError as he:
            failed += len(batch)
            print(f"  批次 {i//BATCH_SIZE + 1}: ❌ HTTP {he.code}: {he.read().decode()[:200]}")
        except Exception as e:
            failed += len(batch)
            print(f"  批次 {i//BATCH_SIZE + 1}: ❌ 错误: {e}")

        time.sleep(REQUEST_DELAY)

    return success, failed


def prepare_and_import():
    """准备导入数据并上传到 Supabase"""
    article_files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "p-*.json")))

    if not article_files:
        print(f"未找到文章文件，请先运行 tuoniaox_scraper.py")
        print(f"查找目录: {ARTICLES_DIR}")
        sys.exit(1)

    print(f"找到 {len(article_files)} 篇文章文件")

    records = []
    stats = {"analysis": 0, "news": 0, "skipped": 0, "no_content": 0}

    for filepath in article_files:
        with open(filepath, "r", encoding="utf-8") as f:
            article = json.load(f)

        # 跳过失败的
        if "error" in article:
            stats["skipped"] += 1
            continue

        # 跳过没有内容的
        if not article.get("content_text") or len(article["content_text"]) < 50:
            stats["no_content"] += 1
            continue

        # 分类
        category = "analysis" if article.get("is_analysis") else "news"
        stats[category] += 1

        # 解析日期
        pub_date = parse_date(article.get("pub_date", ""))

        # 添加迁移声明
        content_html, content_text = add_migration_notes(
            article.get("content_html", ""),
            article.get("content_text", ""),
            pub_date
        )

        # 生成摘要
        excerpt = generate_excerpt(article.get("content_text", ""))

        # 构建记录
        record = {
            "slug": generate_slug(article["title"], article["id"]),
            "title": article["title"],
            "excerpt": excerpt,
            "content": content_text,
            "content_html": content_html,
            "cover_image": article.get("cover_img", ""),
            "category": category,
            "author": article.get("author", "鸵鸟区块链") or "鸵鸟区块链",
            "tags": article.get("tags", []) or [],
            "locale": "zh",
            "source": "tuoniaox",
            "source_url": article.get("original_url", ""),
            "original_id": article["id"],
            "published_at": pub_date,
            "char_count": article.get("char_count", 0),
            "read_time": estimate_read_time(article.get("char_count", 0)),
            "views": 0,
            "is_featured": False,
            "is_published": True,
        }

        records.append(record)

    # 按原始发布时间排序（从早到晚）
    records.sort(key=lambda x: x["published_at"] or "1970-01-01")

    print(f"\n{'=' * 60}")
    print(f"数据统计:")
    print(f"{'=' * 60}")
    print(f"分析类 (→ /zh/analysis 与 /en/analysis): {stats['analysis']}")
    print(f"新闻类 (→ /zh/news):     {stats['news']}")
    print(f"跳过 (抓取失败):         {stats['skipped']}")
    print(f"跳过 (无内容):           {stats['no_content']}")
    print(f"总计可导入:              {len(records)}")

    if not records:
        print("没有可导入的文章")
        return

    # 确认
    print(f"\n时间范围: {records[0].get('published_at', 'N/A')} ~ {records[-1].get('published_at', 'N/A')}")
    print(f"\n准备上传到 Supabase...")

    if not SUPABASE_URL or not SUPABASE_KEY:
        # 保存到本地 JSON 文件作为备用
        output_file = os.path.join(os.path.dirname(ARTICLES_DIR), "import_ready.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"\nSupabase 未配置，已保存到: {output_file}")
        print(f"配置后运行: SUPABASE_URL=... SUPABASE_KEY=... python3 {sys.argv[0]}")
        return

    # 上传
    success, failed = upload_to_supabase(records)

    print(f"\n{'=' * 60}")
    print(f"导入完成!")
    print(f"成功: {success} | 失败: {failed}")
    print(f"{'=' * 60}")
    print(f"\n文章已按发布时间顺序导入到 hashspring.com")
    print(f"分析类文章请访问: https://www.hashspring.com/zh/analysis")
    print(f"英文版将通过 AI 自动翻译展示: https://www.hashspring.com/en/analysis")


if __name__ == "__main__":
    prepare_and_import()
