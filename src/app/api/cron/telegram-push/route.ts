/**
 * Cron Job: Auto-push breaking/important news to Telegram channel
 *
 * Runs every 5 minutes via Vercel Cron.
 * - Fetches latest flash news
 * - Filters for red/orange level items
 * - Tracks already-pushed items to avoid duplicates
 * - Sends new items to Telegram channel
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN — Bot token from @BotFather
 *   TELEGRAM_CHANNEL_ID — Channel ID (e.g., @hashspring_news or -100xxxxx)
 *   CRON_SECRET — Vercel cron auth secret
 */

import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

// In-memory cache of recently pushed item IDs (survives within same serverless instance)
const recentlyPushed = new Set<string>();
const MAX_CACHE_SIZE = 200;

interface FlashItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  category: string;
  source?: string;
  link?: string;
}

interface FlashItemZh {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  category: string;
  source?: string;
  link?: string;
}

function formatTelegramMessage(itemEn: FlashItem, itemZh?: FlashItemZh): string {
  const levelLabel = itemEn.level === 'red' ? '🔴 BREAKING | 突發' : '🟠 IMPORTANT | 重要';
  const enUrl = `https://www.hashspring.com/en/flash/${encodeURIComponent(itemEn.id)}`;
  const zhUrl = `https://www.hashspring.com/zh/flash/${encodeURIComponent(itemEn.id)}`;
  const tag = `#${itemEn.category.replace(/\s+/g, '')} #Crypto`;

  const zhTitle = itemZh?.title || '';

  return [
    `${levelLabel} | ${itemEn.category}`,
    '',
    `📰 ${itemEn.title}`,
    zhTitle && zhTitle !== itemEn.title ? `📰 ${zhTitle}` : '',
    '',
    itemEn.source ? `📌 Source / 來源：${itemEn.source}` : '',
    `🔗 EN: ${enUrl}`,
    `🔗 中文: ${zhUrl}`,
    itemEn.link ? `📎 ${itemEn.link}` : '',
    '',
    tag,
    `— @hashspring`,
  ].filter(Boolean).join('\n');
}

async function sendToTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram Cron] Send failed:', err);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Telegram Cron] Send error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    return NextResponse.json({
      error: 'Telegram not configured',
      hint: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in Vercel env vars',
    }, { status: 500 });
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://www.hashspring.com';

    // Fetch both EN and ZH news in parallel
    const [resEn, resZh] = await Promise.all([
      fetch(`${baseUrl}/api/flash-news?locale=en`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${baseUrl}/api/flash-news?locale=zh`, { signal: AbortSignal.timeout(15000) }),
    ]);

    if (!resEn.ok) {
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    const itemsEn: FlashItem[] = await resEn.json();
    const itemsZh: FlashItemZh[] = resZh.ok ? await resZh.json() : [];

    // Build zh lookup by id for matching
    const zhMap = new Map<string, FlashItemZh>();
    for (const zh of itemsZh) {
      zhMap.set(zh.id, zh);
    }

    // Filter: only push breaking (red) and important (orange) news, skip already pushed
    const important = itemsEn.filter(
      (item) => (item.level === 'red' || item.level === 'orange') && !recentlyPushed.has(item.id)
    );

    if (important.length === 0) {
      return NextResponse.json({
        message: 'No new breaking news to push',
        pushed: 0,
        cached: recentlyPushed.size,
        timestamp: new Date().toISOString(),
      });
    }

    // Push up to 3 items per cron run to avoid spam
    const toPush = important.slice(0, 3);
    let pushed = 0;

    for (const item of toPush) {
      const zhItem = zhMap.get(item.id);
      const msg = formatTelegramMessage(item, zhItem);
      const ok = await sendToTelegram(msg);
      if (ok) {
        pushed++;
        recentlyPushed.add(item.id);

        // Trim cache if too large
        if (recentlyPushed.size > MAX_CACHE_SIZE) {
          const arr = Array.from(recentlyPushed);
          for (let i = 0; i < 50; i++) {
            recentlyPushed.delete(arr[i]);
          }
        }
      }

      // Rate limit: 1 msg/sec
      if (toPush.indexOf(item) < toPush.length - 1) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    console.log(`[Telegram Cron] Pushed ${pushed}/${toPush.length} items`);

    return NextResponse.json({
      message: `Pushed ${pushed} items to Telegram`,
      pushed,
      total_important: important.length,
      cached: recentlyPushed.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Telegram Cron] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
