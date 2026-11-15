import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { getFlashNewsResponse, resolveFlashArticle } from '../src/lib/server/flash-news';
import { generateSeoSlug, flashLookupFilter } from '../src/lib/server/flash-identity';
import { newsSitemapXml } from '../src/lib/server/news-sitemap';
import { RSS_SOURCES } from '../src/lib/api/content-sources';

const originalFetch = globalThis.fetch;
const date = '2026-11-15T12:00:00.000Z';
const rss = `<rss><channel><item><title>Bitcoin Regains $65,000</title><link>https://example.com/original</link><pubDate>${date}</pubDate><description>Verified test fixture summary with a source link.</description></item></channel></rss>`;

test('database outage: list item resolves through the same source with real publication time', async () => {
  process.env.SUPABASE_URL = 'https://database.invalid';
  process.env.SUPABASE_SERVICE_KEY = 'local-test-placeholder';
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('database.invalid')) throw new TypeError('fetch failed');
    if (url === RSS_SOURCES[0].url) return new Response(rss);
    return new Response('', { status: 503 });
  };
  try {
    const feed = await getFlashNewsResponse(new NextRequest('https://www.hashspring.com/api/flash-news?locale=en'));
    assert.equal(feed.headers.get('X-Source'), 'direct-fetch-fallback');
    const [item] = await feed.json();
    assert.ok(item.id);
    assert.equal(item.publishedAt, date);
    const resolved = await resolveFlashArticle(item.id, 'en');
    assert.equal(resolved.item?.title, item.title);
    assert.equal(resolved.item?.link, 'https://example.com/original');
    assert.equal(resolved.source, 'direct-fetch-fallback');
    const detail = await getFlashNewsResponse(new NextRequest(`https://www.hashspring.com/api/flash-news?slug=${item.id}`));
    assert.equal(detail.status, 200);
    const missing = await getFlashNewsResponse(new NextRequest('https://www.hashspring.com/api/flash-news?slug=unavailable-record-abcdef12'));
    assert.equal(missing.status, 503);
    assert.equal(missing.headers.get('Cache-Control'), 'no-store');
  } finally { globalThis.fetch = originalFetch; }
});

test('healthy storage: CMS full identifier resolves and true missing records return 404', async () => {
  const hash = 'admin_123456789012345678901234';
  assert.equal(generateSeoSlug('Editorial title', hash), hash);
  assert.deepEqual(flashLookupFilter(hash), { content_hash: `eq.${hash}` });
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.hostname === 'database.invalid') return Response.json(url.searchParams.get('content_hash') === `eq.${hash}` ? [{
      content_hash: hash, title: 'Editorial title', title_en: 'Editorial title', pub_date: date,
      description: 'A complete editorial test fixture description.', source: 'HashSpring', category: 'BTC',
    }] : []);
    return new Response('', { status: 503 });
  };
  try {
    const resolved = await resolveFlashArticle(hash, 'en');
    assert.equal(resolved.item?.id, hash);
    assert.equal(resolved.source, 'supabase-single');
    const missing = await getFlashNewsResponse(new NextRequest('https://www.hashspring.com/api/flash-news?slug=missing-abcdef12'));
    assert.equal(missing.status, 404);
  } finally { globalThis.fetch = originalFetch; }
});

test('news sitemap omits invalid/old/future dates and never invents homepage news', () => {
  const now = Date.parse(date);
  const item = { id: 'news-12345678', title: 'A & B < C', time: '5m', level: 'blue' as const, category: 'BTC' };
  const xml = newsSitemapXml([
    { ...item, publishedAt: date }, item,
    { ...item, publishedAt: 'bad-date' },
    { ...item, publishedAt: new Date(now - 3 * 86400000).toISOString() },
    { ...item, publishedAt: new Date(now + 86400000).toISOString() },
  ], now);
  assert.equal((xml.match(/<url>/g) || []).length, 3);
  assert.ok(xml.includes('A &amp; B &lt; C'));
  assert.ok(xml.includes(date));
  assert.ok(!newsSitemapXml([], now).includes('<url>'));
});
