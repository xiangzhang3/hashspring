import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const locale = searchParams.get('locale') || 'en';
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
  const offset = Number(searchParams.get('offset') || 0);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0, query: q });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ results: [], total: 0, query: q, error: 'no db' });
  }

  try {
    // 搜索标题和正文（中英文）
    const titleField = locale === 'zh' ? 'title_zh' : 'title_en';
    const bodyField = locale === 'zh' ? 'body_zh' : 'body_en';
    
    // Use ilike for flexible matching
    const filter = `or=(title.ilike.%25${encodeURIComponent(q)}%25,title_en.ilike.%25${encodeURIComponent(q)}%25,title_zh.ilike.%25${encodeURIComponent(q)}%25)`;
    
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?${filter}&select=content_hash,title,title_en,title_zh,description_en,description_zh,category,level,source,pub_date,body_en,body_zh&order=pub_date.desc&limit=${limit}&offset=${offset}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'count=exact',
        },
      }
    );

    const total = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
    const rows = await res.json();

    const results = (rows || []).map((row: any) => {
      const title = locale === 'zh' ? (row.title_zh || row.title) : (row.title_en || row.title);
      const desc = locale === 'zh' ? (row.description_zh || row.description_en || '') : (row.description_en || row.description_zh || '');
      const slug = (row.title_en || row.title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
      const shortHash = (row.content_hash || '').replace(/^h/, '').slice(0, 8);
      const seoSlug = slug ? `${slug}-${shortHash}` : row.content_hash;
      
      return {
        id: seoSlug,
        title,
        description: desc.slice(0, 160),
        category: row.category || 'Crypto',
        level: row.level || 'blue',
        source: row.source,
        published_at: row.pub_date,
        url: `/${locale}/flash/${encodeURIComponent(seoSlug)}`,
      };
    });

    return NextResponse.json(
      { results, total, query: q },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (e) {
    return NextResponse.json({ results: [], total: 0, query: q, error: 'search failed' }, { status: 500 });
  }
}
