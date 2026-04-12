/**
 * Health Check API
 *
 * GET /api/health — Returns service status, DB connectivity, and worker info
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  const checks: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  // Check Supabase connectivity
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/flash_news?select=content_hash&limit=1&order=pub_date.desc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) {
        const rows = await res.json();
        checks.database = {
          status: 'connected',
          latestNews: rows?.[0]?.content_hash ? 'available' : 'empty',
        };
      } else {
        checks.database = { status: 'error', code: res.status };
        checks.status = 'degraded';
      }
    } catch (err) {
      checks.database = { status: 'unreachable', error: String(err) };
      checks.status = 'degraded';
    }
  } else {
    checks.database = { status: 'not_configured' };
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;

  return new Response(JSON.stringify(checks, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
