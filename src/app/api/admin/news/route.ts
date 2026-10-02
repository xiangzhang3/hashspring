import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const URL = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && req.cookies.get('hs_admin')?.value === expected;
}
function headers(extra: Record<string,string> = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
}
function ready() { return Boolean(URL && KEY); }

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ready()) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const p = new URLSearchParams({
    select: 'content_hash,title,title_en,title_zh,description,link,source,source_type,category,level,pub_date,analysis,comment,lang,created_at',
    order: 'pub_date.desc', limit: '100'
  });
  if (q) p.set('or', `(title.ilike.*${q}*,title_zh.ilike.*${q}*,title_en.ilike.*${q}*,source.ilike.*${q}*)`);
  const r = await fetch(`${URL}/rest/v1/flash_news?${p}`, { headers: headers(), cache: 'no-store' });
  return NextResponse.json(await r.json(), { status: r.status });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ready()) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const body = await req.json();
  const title = String(body.title || body.title_zh || body.title_en || '').trim();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const source = String(body.source || 'HashSpring').trim();
  const content_hash = body.content_hash || 'admin_' + createHash('sha256').update(title + '|' + source + '|' + Date.now()).digest('hex').slice(0,24);
  const payload = {
    content_hash, title,
    title_zh: body.title_zh || title,
    title_en: body.title_en || title,
    description: body.description || '',
    link: body.link || '',
    source,
    source_type: body.source_type || 'editorial',
    category: body.category || 'Crypto',
    level: ['red','orange','blue'].includes(body.level) ? body.level : 'blue',
    pub_date: body.pub_date || new Date().toISOString(),
    analysis: body.analysis || null,
    comment: body.comment || null,
    lang: body.lang || 'zh'
  };
  const r = await fetch(`${URL}/rest/v1/flash_news`, {
    method:'POST', headers: headers({Prefer:'return=representation'}), body: JSON.stringify(payload)
  });
  return NextResponse.json(await r.json(), { status:r.status });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ready()) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const body = await req.json();
  const id = String(body.content_hash || '');
  if (!id) return NextResponse.json({ error:'content_hash required' }, { status:400 });
  const allowed = ['title','title_zh','title_en','description','link','source','source_type','category','level','pub_date','analysis','comment','lang'];
  const patch: Record<string,unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  const r = await fetch(`${URL}/rest/v1/flash_news?content_hash=eq.${encodeURIComponent(id)}`, {
    method:'PATCH', headers: headers({Prefer:'return=representation'}), body:JSON.stringify(patch)
  });
  return NextResponse.json(await r.json(), { status:r.status });
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ready()) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error:'id required' }, { status:400 });
  const r = await fetch(`${URL}/rest/v1/flash_news?content_hash=eq.${encodeURIComponent(id)}`, {
    method:'DELETE', headers: headers({Prefer:'return=representation'})
  });
  return NextResponse.json(await r.json(), { status:r.status });
}
