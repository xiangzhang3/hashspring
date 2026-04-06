import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const qs = new URLSearchParams({
      select: '*',
      slug: `eq.${params.slug}`,
      is_published: 'eq.true',
      limit: '1',
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?${qs}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const articles = await res.json();
    if (!articles.length) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articles[0];
    fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ views: (article.views || 0) + 1 }),
    }).catch(() => {});

    return NextResponse.json(article);
  } catch (err: any) {
    console.error('[api/articles/slug] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
