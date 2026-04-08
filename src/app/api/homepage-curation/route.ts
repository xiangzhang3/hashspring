import { NextResponse } from 'next/server';
import type { Locale } from '@/lib/i18n';
import { getHomepageCuration } from '@/lib/server/homepage-curation';

export const revalidate = 120;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'zh') as Locale;
  const payload = await getHomepageCuration(locale, 5);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  });
}
