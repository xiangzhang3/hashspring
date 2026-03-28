/**
 * Telegram Bot Push API
 *
 * Pushes breaking/important flash news to a Telegram channel.
 *
 * Environment variables needed:
 *   TELEGRAM_BOT_TOKEN — Bot token from @BotFather
 *   TELEGRAM_CHANNEL_ID — Channel ID (e.g., @hashspring or -100xxxxx)
 *
 * Usage:
 *   POST /api/telegram-push
 *   Header: x-api-key: <your-secret>
 *
 *   Or called from cron job to auto-push new breaking news.
 */

import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const API_SECRET = process.env.TELEGRAM_API_SECRET || process.env.CRON_SECRET || '';

interface FlashItem {
  id: string;
  level: 'red' | 'orange' | 'blue';
  time: string;
  title: string;
  category: string;
  source?: string;
  link?: string;
}

// ─── Format message for Telegram ───
function formatTelegramMessage(item: FlashItem, locale: string): string {
  const levelEmoji = item.level === 'red' ? '🔴 突发' : item.level === 'orange' ? '🟠 重要' : '🔵 快讯';
  const levelEn = item.level === 'red' ? '🔴 BREAKING' : item.level === 'orange' ? '🟠 IMPORTANT' : '🔵 FLASH';

  const tag = `#${item.category} #Crypto`;
  const hashspringUrl = `https://hashspring.com/${locale}/flash/${encodeURIComponent(item.id)}`;

  if (locale === 'zh') {
    return [
      `${levelEmoji} | ${item.category}`,
      '',
      `📰 ${item.title}`,
      '',
      `🕐 ${item.time}`,
      item.source ? `📌 来源：${item.source}` : '',
      '',
      `🔗 详情：${hashspringUrl}`,
      item.link ? `📎 原文：${item.link}` : '',
      '',
      `${tag}`,
      `— via @hashspring`,
    ].filter(Boolean).join('\n');
  }

  return [
    `${levelEn} | ${item.category}`,
    '',
    `📰 ${item.title}`,
    '',
    `🕐 ${item.time}`,
    item.source ? `📌 Source: ${item.source}` : '',
    '',
    `🔗 Details: ${hashspringUrl}`,
    item.link ? `📎 Original: ${item.link}` : '',
    '',
    `${tag}`,
    `— via @hashspring`,
  ].filter(Boolean).join('\n');
}

// ─── Send message to Telegram ───
async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.warn('Telegram credentials not configured');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Telegram API error:', err);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Telegram send failed:', error);
    return false;
  }
}

// ─── Main handler ───
export async function POST(request: NextRequest) {
  // Auth check
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (API_SECRET && apiKey !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const locale = (body as any).locale || 'en';

    // Fetch latest news
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://hashspring.com';

    const res = await fetch(`${baseUrl}/api/flash-news?locale=${locale}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    const items: FlashItem[] = await res.json();

    // Filter: only push breaking (red) and important (orange) news
    const importantItems = items.filter(
      (item) => item.level === 'red' || item.level === 'orange'
    ).slice(0, 5);

    if (importantItems.length === 0) {
      return NextResponse.json({ message: 'No breaking news to push', pushed: 0 });
    }

    // Send each item
    let pushed = 0;
    for (const item of importantItems) {
      const msg = formatTelegramMessage(item, locale);
      const ok = await sendTelegramMessage(msg);
      if (ok) pushed++;

      // Rate limit: 1 message per second
      if (importantItems.indexOf(item) < importantItems.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      message: `Pushed ${pushed}/${importantItems.length} items to Telegram`,
      pushed,
      total: importantItems.length,
    });
  } catch (error) {
    console.error('Telegram push error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID),
    channel: TELEGRAM_CHANNEL_ID || 'not configured',
    usage: 'POST /api/telegram-push with { locale: "en" | "zh" }',
  });
}
