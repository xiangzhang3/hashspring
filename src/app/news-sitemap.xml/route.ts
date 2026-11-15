import { NextResponse } from 'next/server';
import { getFlashSitemapItems } from '@/lib/server/flash-news';
import { newsSitemapXml } from '@/lib/server/news-sitemap';
export const revalidate = 60;
export async function GET() {
  try {
    const { items, source } = await getFlashSitemapItems();
    // Never invent news or publication dates when upstream content is unavailable.
    if (!items.length && source !== 'supabase') throw new Error('News feed unavailable');
    return new NextResponse(newsSitemapXml(items), { headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'X-Source': source,
    } });
  } catch {
    return new NextResponse('News sitemap temporarily unavailable', { status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
