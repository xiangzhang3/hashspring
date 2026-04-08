import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Unified search API — searches both flash_news AND articles tables.
 * Matches title + body/content for comprehensive results.
 *
 * GET /api/search?q=keyword&locale=en&limit=30&offset=0
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const locale = searchParams.get('locale') || 'en';
  const limit = Math.min(Number(searchParams.get('limit') || 30), 50);
  const offset = Number(searchParams.get('offset') || 0);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0, query: q });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ results: [], total: 0, query: q, error: 'no db' });
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: 'count=exact',
  };

  const encoded = encodeURIComponent(q);

  try {
    // ── 1. Search flash_news (title + body) ──
    const flashFilter = `or=(title.ilike.%25${encoded}%25,title_en.ilike.%25${encoded}%25,title_zh.ilike.%25${encoded}%25,body_en.ilike.%25${encoded}%25,body_zh.ilike.%25${encoded}%25,description.ilike.%25${encoded}%25)`;
    const flashPromise = fetch(
      `${SUPABASE_URL}/rest/v1/flash_news?${flashFilter}&select=content_hash,title,title_en,title_zh,title_fil,description,description_en,description_zh,category,level,source,pub_date,body_en,body_zh&order=pub_date.desc&limit=${limit}&offset=${offset}`,
      { headers, next: { revalidate: 60 } },
    );

    // ── 2. Search articles (title + excerpt + content) ──
    const articleFilter = `or=(title.ilike.%25${encoded}%25,title_en.ilike.%25${encoded}%25,excerpt.ilike.%25${encoded}%25,excerpt_en.ilike.%25${encoded}%25,content.ilike.%25${encoded}%25)`;
    const articlePromise = fetch(
      `${SUPABASE_URL}/rest/v1/articles?${articleFilter}&is_published=eq.true&select=id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,category,author,published_at,source&order=published_at.desc&limit=${limit}&offset=${offset}`,
      { headers, next: { revalidate: 60 } },
    );

    const [flashRes, articleRes] = await Promise.all([flashPromise, articlePromise]);

    // ── Parse flash_news results ──
    const flashTotal = parseInt(flashRes.headers.get('content-range')?.split('/')[1] || '0');
    const flashRows = flashRes.ok ? await flashRes.json() : [];

    const flashResults = (flashRows || []).map((row: any) => {
      const title = locale === 'zh'
        ? (row.title_zh || row.title)
        : locale === 'fil'
        ? (row.title_fil || row.title_en || row.title)
        : (row.title_en || row.title);
      const desc = locale === 'zh'
        ? (row.description_zh || row.description_en || row.description || '')
        : (row.description_en || row.description_zh || row.description || '');
      const slug = (row.title_en || row.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);
      const shortHash = (row.content_hash || '').replace(/^h/, '').slice(0, 8);
      const seoSlug = slug ? `${slug}-${shortHash}` : row.content_hash;

      return {
        id: seoSlug,
        type: 'flash' as const,
        title,
        description: desc.slice(0, 160),
        category: row.category || 'Crypto',
        level: row.level || 'blue',
        source: row.source,
        published_at: row.pub_date,
        url: `/${locale}/flash/${encodeURIComponent(seoSlug)}`,
      };
    });

    // ── Parse articles results ──
    const articleTotal = parseInt(articleRes.headers.get('content-range')?.split('/')[1] || '0');
    const articleRows = articleRes.ok ? await articleRes.json() : [];

    const articleResults = (articleRows || []).map((row: any) => {
      const title = locale === 'zh'
        ? (row.title || row.title_en)
        : locale === 'fil'
        ? (row.title_fil || row.title_en || row.title)
        : (row.title_en || row.title);
      const desc = locale === 'zh'
        ? (row.excerpt || row.excerpt_en || '')
        : locale === 'fil'
        ? (row.excerpt_fil || row.excerpt_en || row.excerpt || '')
        : (row.excerpt_en || row.excerpt || '');

      return {
        id: row.slug,
        type: 'article' as const,
        title,
        description: desc.slice(0, 160),
        category: row.category || 'analysis',
        level: 'blue',
        source: row.source || row.author,
        published_at: row.published_at,
        url: `/${locale}/analysis/${row.slug}`,
      };
    });

    // ── Merge & sort by date descending ──
    const allResults = [...flashResults, ...articleResults]
      .sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .slice(0, limit);

    return NextResponse.json(
      {
        results: allResults,
        total: flashTotal + articleTotal,
        flash_count: flashResults.length,
        article_count: articleResults.length,
        query: q,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (e) {
    console.error('[Search API] Error:', e);
    return NextResponse.json({ results: [], total: 0, query: q, error: 'search failed' }, { status: 500 });
  }
}
