import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * On-demand ISR revalidation webhook.
 *
 * Usage:
 *   POST /api/revalidate
 *   Headers: { Authorization: Bearer <CRON_SECRET> }
 *   Body:    { "paths": ["/en", "/en/analysis", "/en/analysis/btc-cycle-analysis"], "type": "page" }
 *
 * Or shorthand to revalidate common pages:
 *   POST /api/revalidate
 *   Body:    { "scope": "all" | "homepage" | "analysis" | "flash" }
 *
 * Called by worker after inserting new content, or manually via curl.
 */

const CRON_SECRET = process.env.CRON_SECRET || '';
const LOCALES = ['en', 'zh', 'fil'];

function authorize(req: NextRequest): boolean {
  // Accept Vercel cron header
  if (req.headers.get('x-vercel-cron') === '1') return true;

  // Accept Bearer token
  const auth = req.headers.get('authorization') || '';
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true;

  // Accept query param for simple curl usage
  const secret = req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret === CRON_SECRET) return true;

  // In development, allow all
  if (process.env.NODE_ENV === 'development') return true;

  return false;
}

interface RevalidateBody {
  paths?: string[];
  type?: 'page' | 'layout';
  scope?: 'all' | 'homepage' | 'analysis' | 'flash';
}

function getScopePaths(scope: string): string[] {
  const paths: string[] = [];

  for (const locale of LOCALES) {
    if (scope === 'all' || scope === 'homepage') {
      paths.push(`/${locale}`);
    }
    if (scope === 'all' || scope === 'analysis') {
      paths.push(`/${locale}/analysis`);
    }
    if (scope === 'all' || scope === 'flash') {
      paths.push(`/${locale}/flashnews`);
    }
  }

  if (scope === 'all') {
    paths.push('/en/feed.xml', '/zh/feed.xml', '/fil/feed.xml');
  }

  return paths;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: RevalidateBody = await req.json().catch(() => ({}));

    let pathsToRevalidate: string[] = [];
    const revalidateType = body.type || 'page';

    if (body.scope) {
      pathsToRevalidate = getScopePaths(body.scope);
    } else if (body.paths && Array.isArray(body.paths)) {
      pathsToRevalidate = body.paths.filter(
        (p) => typeof p === 'string' && p.startsWith('/'),
      );
    } else {
      // Default: revalidate homepage + analysis for all locales
      pathsToRevalidate = getScopePaths('all');
    }

    if (pathsToRevalidate.length === 0) {
      return NextResponse.json({ error: 'No valid paths to revalidate' }, { status: 400 });
    }

    // Cap at 50 paths per request to avoid abuse
    const capped = pathsToRevalidate.slice(0, 50);

    for (const path of capped) {
      revalidatePath(path, revalidateType);
    }

    return NextResponse.json({
      revalidated: true,
      paths: capped,
      count: capped.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[revalidate] Error:', err);
    return NextResponse.json(
      { error: 'Internal error', message: String(err) },
      { status: 500 },
    );
  }
}

// Also support GET for simple testing
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') || 'all';
  const paths = getScopePaths(scope);

  for (const path of paths) {
    revalidatePath(path, 'page');
  }

  return NextResponse.json({
    revalidated: true,
    paths,
    count: paths.length,
    timestamp: new Date().toISOString(),
  });
}
