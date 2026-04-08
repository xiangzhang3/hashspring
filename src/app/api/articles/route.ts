import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const revalidate = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'analysis';
    const locale = searchParams.get('locale') || 'zh';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;
    const featured = searchParams.get('featured');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
      select: 'id,slug,title,excerpt,cover_image,category,author,tags,locale,published_at,char_count,read_time,views,is_featured,source',
      category: `eq.${category}`,
      locale: `eq.${locale}`,
      is_published: 'eq.true',
      order: 'published_at.desc',
      offset: String(offset),
      limit: String(limit),
    });

    if (featured === 'true') {
      params.set('is_featured', 'eq.true');
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);

    const articles = await res.json();
    const total = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');

    return NextResponse.json({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('[api/articles] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
