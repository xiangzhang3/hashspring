/**
 * Flash News Cron — Enhanced with Direct Supabase Write
 *
 * This cron runs daily (and can be triggered manually) to ensure
 * fresh content flows into the database even when the Worker is down.
 *
 * Logic:
 * 1. Check if Worker is active (latest flash_news < 2 hours old)
 * 2. If Worker is active → do nothing (Worker handles everything)
 * 3. If Worker is DOWN → directly fetch top RSS sources, classify,
 *    and write to flash_news table as a safety net
 *
 * Schedule: 0 0 * * * (daily at 00:00 UTC)
 * Manual:   GET /api/cron/fetch-news
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  RSS_SOURCES,
  CHINESE_SOURCES,
  CATEGORY_MAP,
  BREAKING_KEYWORDS,
  IMPORTANT_KEYWORDS,
  contentHash,
} from '@/lib/api/content-sources';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// ── Helpers ─────────────────────────────────────────────
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '');
}

function cleanTitle(t: string): string {
  return t ? t.replace(/[.。．]+\s*$/, '').trim() : t;
}

function classifyLevel(title: string): 'red' | 'orange' | 'blue' {
  const lower = title.toLowerCase();
  const breakingKW = ['hack', 'exploit', 'sec', 'etf', 'crash', 'surge', 'emergency', 'ban', 'approve', 'listing', 'delist', '暴跌', '暴涨', '被盗', '紧急', '批准'];
  const importantKW = ['bitcoin', 'ethereum', 'btc', 'eth', 'regulation', 'fed', 'fomc', 'whale', 'airdrop', 'unlock', '比特币', '以太坊', '监管'];
  if (breakingKW.some(kw => lower.includes(kw))) return 'red';
  if (importantKW.some(kw => lower.includes(kw))) return 'orange';
  return 'blue';
}

function classifyCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if ((keywords as string[]).some(kw => lower.includes(kw))) return cat;
  }
  return 'Crypto';
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  lang: 'en' | 'zh';
}

function parseRssXml(xml: string, sourceName: string, lang: 'en' | 'zh'): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = decodeEntities(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
    const link = decodeEntities(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    const desc = decodeEntities(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '').trim();
    if (title) {
      items.push({ title: cleanTitle(title), link, pubDate, description: desc.slice(0, 500), source: sourceName, lang });
    }
  }
  return items;
}

async function fetchRssSource(url: string, name: string, lang: 'en' | 'zh'): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HashSpring/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, name, lang);
  } catch {
    console.warn(`[CRON] Failed to fetch ${name}: timeout or error`);
    return [];
  }
}

async function translateTitles(titles: string[], targetLang: 'zh' | 'en'): Promise<Record<number, string>> {
  if (!ANTHROPIC_KEY || titles.length === 0) return {};
  const langLabel = targetLang === 'zh' ? 'Traditional Chinese (繁體中文)' : 'English';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Translate these crypto news headlines to ${langLabel}. Keep crypto terms (BTC, ETH, DeFi, NFT, etc.) and brand names in English. Output JSON array of translations only, no explanation.\n\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      const result: Record<number, string> = {};
      arr.forEach((t: string, i: number) => { result[i] = cleanTitle(t); });
      return result;
    }
  } catch (e) {
    console.warn('[CRON] Translation error:', e);
  }
  return {};
}

// ── Supabase helpers ────────────────────────────────────
async function supabaseQuery(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...(options.headers || {}),
    },
  });
}

async function checkWorkerActive(): Promise<{ active: boolean; latestPubDate: string | null }> {
  try {
    const res = await supabaseQuery(
      'flash_news?select=pub_date&order=pub_date.desc&limit=1',
      { headers: { 'Prefer': 'return=representation' } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const latest = new Date(data[0].pub_date);
      const hoursAgo = (Date.now() - latest.getTime()) / (1000 * 60 * 60);
      return { active: hoursAgo < 2, latestPubDate: data[0].pub_date };
    }
  } catch (e) {
    console.warn('[CRON] Failed to check worker status:', e);
  }
  return { active: false, latestPubDate: null };
}

async function getExistingHashes(hashes: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    // Query in batches of 30
    for (let i = 0; i < hashes.length; i += 30) {
      const batch = hashes.slice(i, i + 30);
      const encoded = batch.map(h => `"${h}"`).join(',');
      const res = await supabaseQuery(
        `flash_news?select=content_hash&content_hash=in.(${encoded})`,
        { headers: { 'Prefer': 'return=representation' } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((row: { content_hash: string }) => set.add(row.content_hash));
      }
    }
  } catch (e) {
    console.warn('[CRON] Failed to check existing hashes:', e);
  }
  return set;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret (skip for manual trigger in dev)
    const cronSecret = request.headers.get('x-vercel-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    const isManual = request.nextUrl.searchParams.get('manual') === '1';

    if (!isManual && expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Check if Worker is active
    const { active: workerActive, latestPubDate } = await checkWorkerActive();

    if (workerActive) {
      console.log('[CRON] Worker is active, latest content:', latestPubDate);
      return NextResponse.json({
        success: true,
        mode: 'worker-active',
        message: 'Worker is running, no cron action needed',
        latestPubDate,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Worker is DOWN — fetch content directly
    console.log('[CRON] ⚠️ Worker appears DOWN (latest:', latestPubDate, '), fetching content directly...');

    // Fetch from top-tier RSS sources only (fast + reliable)
    const topSources = RSS_SOURCES.filter(s => s.tier <= 2);
    const chineseSources = CHINESE_SOURCES.filter(s => s.type === 'rss');

    const fetchPromises = [
      ...topSources.map(s => fetchRssSource(s.url, s.name, 'en' as const)),
      ...chineseSources.map(s => fetchRssSource(s.url, s.name, 'zh' as const)),
    ];

    const results = await Promise.all(fetchPromises);
    const allItems = results.flat();

    console.log(`[CRON] Fetched ${allItems.length} items from ${topSources.length + chineseSources.length} sources`);

    if (allItems.length === 0) {
      return NextResponse.json({
        success: false,
        mode: 'cron-fallback',
        error: 'All RSS sources returned empty',
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    // Filter: only items from past 12 hours
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const recentItems = allItems.filter(item => {
      try {
        const pubTime = new Date(item.pubDate).getTime();
        return pubTime > twelveHoursAgo || isNaN(pubTime);
      } catch { return true; }
    });

    // Deduplicate against existing content
    const hashes = recentItems.map(item => contentHash(item.title, item.source));
    const existingHashes = await getExistingHashes(hashes);

    const newItems = recentItems.filter(item => {
      const hash = contentHash(item.title, item.source);
      return !existingHashes.has(hash);
    });

    console.log(`[CRON] ${newItems.length} new items (${recentItems.length - newItems.length} already exist)`);

    if (newItems.length === 0) {
      return NextResponse.json({
        success: true,
        mode: 'cron-fallback',
        message: 'No new content to publish',
        checked: recentItems.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Limit to 30 items per run
    const toPublish = newItems.slice(0, 30);

    // Step 3: Translate titles
    const enItems = toPublish.filter(item => item.lang === 'en');
    const zhItems = toPublish.filter(item => item.lang === 'zh');

    let zhTranslations: Record<number, string> = {};
    let enTranslations: Record<number, string> = {};

    if (enItems.length > 0) {
      zhTranslations = await translateTitles(enItems.map(i => i.title), 'zh');
    }
    if (zhItems.length > 0) {
      enTranslations = await translateTitles(zhItems.map(i => i.title), 'en');
    }

    // Step 4: Build records and upsert to Supabase
    let enIdx = 0;
    let zhIdx = 0;

    const records = toPublish.map(item => {
      const hash = contentHash(item.title, item.source);
      const isEn = item.lang === 'en';

      let title_en: string;
      let title_zh: string;

      if (isEn) {
        title_en = item.title;
        title_zh = zhTranslations[enIdx] || item.title;
        enIdx++;
      } else {
        title_zh = item.title;
        title_en = enTranslations[zhIdx] || item.title;
        zhIdx++;
      }

      return {
        content_hash: hash,
        title: item.title,
        title_en: cleanTitle(title_en),
        title_zh: cleanTitle(title_zh),
        description: item.description || '',
        link: item.link || '',
        source: item.source,
        source_type: 'rss',
        category: classifyCategory(item.title),
        level: classifyLevel(item.title),
        pub_date: item.pubDate || new Date().toISOString(),
        lang: item.lang,
      };
    });

    // Batch upsert (50 per batch)
    let writeSuccess = 0;
    let writeFail = 0;
    const BATCH = 50;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      try {
        const res = await supabaseQuery('flash_news', {
          method: 'POST',
          body: JSON.stringify(batch),
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        });
        if (res.ok) {
          writeSuccess += batch.length;
        } else {
          const err = await res.text();
          console.error('[CRON] Supabase write error:', err);
          writeFail += batch.length;
        }
      } catch (e) {
        console.error('[CRON] Supabase write exception:', e);
        writeFail += batch.length;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CRON] ✅ Published ${writeSuccess} items (${writeFail} failed) in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      mode: 'cron-fallback',
      message: `Worker DOWN — cron published ${writeSuccess} items directly`,
      workerLastSeen: latestPubDate,
      fetched: allItems.length,
      new: newItems.length,
      published: writeSuccess,
      failed: writeFail,
      elapsed: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Flash news cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
