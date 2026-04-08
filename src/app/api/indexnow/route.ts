/**
 * IndexNow API endpoint
 *
 * Called by the worker (or cron) after new content is published to Supabase.
 * Notifies Bing/Yandex/Google (via IndexNow protocol) of new URLs
 * so they get crawled and indexed within minutes instead of days.
 *
 * POST /api/indexnow
 * Body: { urls: string[] }
 * Header: x-api-key: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'hashspring2026indexnow';
const SITE_URL = 'https://www.hashspring.com';

export async function POST(request: NextRequest) {
  // Auth
  const apiKey = request.headers.get('x-api-key') || '';
  const secret = process.env.CRON_SECRET || process.env.INDEXNOW_SECRET || '';
  if (secret && apiKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const urls: string[] = body.urls || [];

    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Submit to IndexNow (Bing endpoint, which shares with Yandex/others)
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'hashspring.com',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 100), // IndexNow allows up to 10,000 per batch
      }),
    });

    const status = res.status;
    console.log(`[IndexNow] Submitted ${urls.length} URLs, response: ${status}`);

    return NextResponse.json({
      message: `Submitted ${urls.length} URLs to IndexNow`,
      indexnow_status: status,
      urls: urls.slice(0, 5),
    });
  } catch (error) {
    console.error('[IndexNow] Error:', error);
    return NextResponse.json({ error: 'IndexNow submission failed' }, { status: 500 });
  }
}

// GET: return the IndexNow key for verification
export async function GET() {
  return new NextResponse(INDEXNOW_KEY, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
