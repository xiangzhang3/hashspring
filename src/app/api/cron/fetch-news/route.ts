import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-vercel-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the flash-news API internally
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const fetchPromises = [
      fetch(`${baseUrl}/api/flash-news?locale=en`),
      fetch(`${baseUrl}/api/flash-news?locale=zh`),
    ];

    const results = await Promise.all(fetchPromises);

    const data = await Promise.all(
      results.map(async (res) => {
        if (!res.ok) {
          return { status: res.status, error: res.statusText };
        }
        return res.json();
      })
    );

    console.log('[CRON] Flash news fetch completed', {
      timestamp: new Date().toISOString(),
      locale_en_items: data[0]?.length || 0,
      locale_zh_items: data[1]?.length || 0,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        en: data[0]?.length || 0,
        zh: data[1]?.length || 0,
      },
    });
  } catch (error) {
    console.error('[CRON] Flash news fetch failed:', error);

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
