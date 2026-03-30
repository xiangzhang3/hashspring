import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const { hash } = params;

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.redirect(new URL('/zh', request.url));
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash,title_en&content_hash=like.h${hash}*&order=published_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.redirect(new URL('/zh', request.url));
    }

    const rows = await res.json();
    const data = rows?.[0];

    if (!data) {
      return NextResponse.redirect(new URL('/zh', request.url));
    }

    const slug = (data.title_en || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    const shortHash = data.content_hash.replace(/^h/, '').slice(0, 8);
    const seoSlug = slug ? `${slug}-${shortHash}` : data.content_hash;

    return NextResponse.redirect(
      new URL(`/zh/flash/${encodeURIComponent(seoSlug)}`, request.url),
      { status: 301 }
    );
  } catch (e) {
    return NextResponse.redirect(new URL('/zh', request.url));
  }
}
