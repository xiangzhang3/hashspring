#!/usr/bin/env python3
"""
为 articles 表批量回填英文内容。

用途：
  - 将 tuoniaox.com 迁移来的中文文章批量翻译成英文
  - 回写 title_en / excerpt_en / content_en / content_html_en
  - 让 /en/analysis 直接读取持久化英文内容，而不是每次请求临时翻译

运行前：
  1. 先在 Supabase 执行 add_articles_en_columns.sql
  2. 配置 .env.local 或环境变量中的：
     SUPABASE_URL
     SUPABASE_SERVICE_KEY
     ANTHROPIC_API_KEY

运行：
  python3 backfill_articles_en.py
"""

import json
import os
import re
import sys
import time
from typing import Dict, List

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
BATCH_SIZE = 5
SLEEP_BETWEEN_BATCHES = 2
FETCH_PAGE_SIZE = 200


def create_session() -> requests.Session:
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1,
        status_forcelist=[408, 429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST", "PATCH"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


SESSION = create_session()


def load_env_local():
    env = {}
    env_path = os.path.join(os.getcwd(), ".env.local")
    if os.path.exists(env_path):
      with open(env_path, "r", encoding="utf-8") as f:
          for line in f:
              line = line.strip()
              if line and not line.startswith("#") and "=" in line:
                  k, v = line.split("=", 1)
                  env[k.strip()] = v.strip()
    return env


_env = load_env_local()
SUPABASE_URL = os.environ.get("SUPABASE_URL", _env.get("SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", _env.get("SUPABASE_SERVICE_KEY", ""))
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", _env.get("ANTHROPIC_API_KEY", ""))


def require_env():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if missing:
        print("缺少环境变量:", ", ".join(missing))
        sys.exit(1)


def strip_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return text.strip()


def fetch_candidates() -> List[Dict]:
    rows: List[Dict] = []
    offset = 0

    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/articles"
            "?select=id,slug,title,excerpt,content,content_html,source,locale,published_at,title_en,excerpt_en,content_en,category"
            "&category=eq.analysis"
            "&is_published=eq.true"
            "&order=published_at.desc"
            f"&limit={FETCH_PAGE_SIZE}"
            f"&offset={offset}"
        )
        res = SESSION.get(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }, timeout=30)
        res.raise_for_status()
        batch = res.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < FETCH_PAGE_SIZE:
            break
        offset += FETCH_PAGE_SIZE

    return [
        r for r in rows
        if (r.get("source") == "tuoniaox" or r.get("locale") == "zh")
        and (not r.get("title_en") or not r.get("excerpt_en") or not r.get("content_en"))
    ]


def call_claude(title: str, excerpt: str, content: str) -> Dict[str, str]:
    system = """You are a professional crypto media translator and editor.
Translate this Chinese analysis article into natural, publication-quality English.

Return valid JSON only:
{"title_en":"...","excerpt_en":"...","content_en":"..."}

Rules:
- Keep crypto terms, protocol names, exchange names, and ticker symbols unchanged
- Preserve the original meaning accurately
- Make the English sound like a professional analysis article
- Do not add facts not present in the source
- Remove migration notices and boilerplate if present
"""

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": system,
        "messages": [{
            "role": "user",
            "content": f"Title:\n{title}\n\nExcerpt:\n{excerpt}\n\nContent:\n{content[:12000]}"
        }]
    }
    res = SESSION.post(
        ANTHROPIC_URL,
        headers={
            "content-type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        json=payload,
        timeout=60,
    )
    res.raise_for_status()
    data = res.json()
    text = data.get("content", [{}])[0].get("text", "").strip()
    return parse_translation_json(text)


def parse_translation_json(text: str) -> Dict[str, str]:
    if not text:
        raise ValueError("Claude returned empty text")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, flags=re.I)
    if fenced:
        return json.loads(fenced.group(1))

    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return json.loads(text[first:last + 1])

    raise ValueError(f"Could not parse JSON from Claude response: {text[:200]}")


def build_content_html_en(content_en: str) -> str:
    paragraphs = [p.strip() for p in content_en.split("\n") if p.strip()]
    return "\n".join(f"<p>{p}</p>" for p in paragraphs)


def update_article(article_id: int, fields: Dict[str, str]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}"
    res = SESSION.patch(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
        json=fields,
        timeout=30,
    )
    res.raise_for_status()


def main():
    require_env()
    rows = fetch_candidates()
    print(f"待回填英文内容: {len(rows)} 篇")
    if not rows:
        return

    success = 0
    failed = 0

    for idx, row in enumerate(rows, 1):
        title = row.get("title", "")
        excerpt = row.get("excerpt", "")
        content = row.get("content", "") or strip_html(row.get("content_html", ""))
        try:
            translated = call_claude(title, excerpt, content)
            content_en = translated.get("content_en", "").strip()
            fields = {
                "title_en": translated.get("title_en", "").strip() or title,
                "excerpt_en": translated.get("excerpt_en", "").strip() or excerpt,
                "content_en": content_en,
                "content_html_en": build_content_html_en(content_en) if content_en else "",
            }
            update_article(row["id"], fields)
            success += 1
            print(f"[{idx}/{len(rows)}] ✅ {row['slug']}")
        except Exception as exc:
            failed += 1
            print(f"[{idx}/{len(rows)}] ❌ {row['slug']}: {exc}")

        if idx % BATCH_SIZE == 0:
            time.sleep(SLEEP_BETWEEN_BATCHES)

    print(f"\n完成：成功 {success}，失败 {failed}")


if __name__ == "__main__":
    main()
